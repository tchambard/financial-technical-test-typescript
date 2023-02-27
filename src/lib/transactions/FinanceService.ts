import * as BN from 'bn.js';

import { ITransactionData, ITransactionModel, ITransactionsReader, TransactionDirection } from '../types/transactions';
import { ITransactionCostBasisData, ITransactionCostBasisModel, ITransactionsCostBasisReader } from '../types/transactionsCostBasis';
import { ITransactionCostBasisLotModel, ITransactionsCostBasisLotReader } from '../types/transactionsCostBasisLot';
import { TransactionsCostBasisDbDao } from './TransactionsCostBasisDbDao';
import { TransactionsCostBasisLotDbDao } from './TransactionsCostBasisLotDbDao';
import { TransactionsDbDao } from './TransactionsDbDao';

interface ITransactionWithCostBasis extends ITransactionCostBasisModel {
    txVolume: BN;
    txRate: BN;
}

export class FinanceService {
    private readonly transactionsDbDao: TransactionsDbDao;
    private readonly costsBasisDbDao: TransactionsCostBasisDbDao;
    private readonly costsBasisLotDbDao: TransactionsCostBasisLotDbDao;

    constructor(
        transactionsDbDao: TransactionsDbDao,
        costsBasisDbDao: TransactionsCostBasisDbDao,
        costsBasisLotDbDao: TransactionsCostBasisLotDbDao,
    ) {
        this.transactionsDbDao = transactionsDbDao;
        this.costsBasisDbDao = costsBasisDbDao;
        this.costsBasisLotDbDao = costsBasisLotDbDao;
    }

    public async createTransaction(symbolData: ITransactionData): Promise<ITransactionModel> {
        return this.transactionsDbDao.createTransaction(symbolData);
    }

    public async readAllTransactions(): Promise<ITransactionsReader> {
        return this.transactionsDbDao.readAllTransactions();
    }

    public async readAllTransactionsCostBasis(): Promise<ITransactionsCostBasisReader> {
        return this.costsBasisDbDao.readAllTransactionsCostBasis();
    }

    public async readAllTransactionsCostBasisLots(): Promise<ITransactionsCostBasisLotReader> {
        return this.costsBasisLotDbDao.readAllTransactionsCostBasisLots();
    }

    public async computeCostsBasis() {
        const { reader: transactions } = await this.readAllTransactions();

        const txInCache: ITransactionWithCostBasis[] = [];
        let activeTxIn: ITransactionWithCostBasis | undefined;

        let lastCostBasis: ITransactionCostBasisData = {
            totalVolume: new BN(0),
            totalCostUsd: new BN(0),
        };

        await transactions.forEach(async (transaction) => {

            if (transaction.direction === TransactionDirection.IN) {
                const txCostUsd = transaction.volume.mul(transaction.rate);

                // compute and store TX cost basis
                const costBasis: ITransactionCostBasisModel = {
                    txId: transaction.id,
                    totalVolume: lastCostBasis.totalVolume.add(transaction.volume),
                    totalCostUsd: lastCostBasis.totalCostUsd.add(txCostUsd),
                };
                await this.costsBasisDbDao.createTransactionCostBasis(costBasis);

                lastCostBasis = {
                    totalVolume: costBasis.totalVolume,
                    totalCostUsd: costBasis.totalCostUsd,
                };

                // keep TX cost basis in cache
                txInCache.push({
                    ...costBasis,
                    txVolume: transaction.volume,
                    txRate: transaction.rate,
                });
            } else {

                const volumeToSell = transaction.volume;
                const fairMarketValue = transaction.rate;

                const costBasis: ITransactionCostBasisModel = {
                    txId: transaction.id,
                    totalVolume: lastCostBasis.totalVolume,
                    totalCostUsd: lastCostBasis.totalCostUsd,
                    txPnl: new BN(0),
                };

                let targetedVolume = new BN(0);

                while (targetedVolume.cmp(volumeToSell) === -1) {
                    if (!activeTxIn || activeTxIn.txVolume.eq(new BN(0))) {
                        // set active TX taking first IN
                        activeTxIn = txInCache.shift();
                        if (!activeTxIn) {
                            // I guess this should never happen !
                            throw new Error('No sufficient funds');
                        }
                    }

                    // pick volume if available on active transaction
                    const volumeOnCurrentTx = BN.min(volumeToSell.sub(targetedVolume), activeTxIn.txVolume);

                    // increment targeted volume
                    targetedVolume = targetedVolume.add(volumeOnCurrentTx);

                    // compute and store TX cost basis lot
                    const txShareCostUsd = volumeOnCurrentTx.mul(activeTxIn.txRate);
                    const lot: ITransactionCostBasisLotModel = {
                        txOutId: transaction.id,
                        txInId: activeTxIn.txId,
                        txInVolume: volumeOnCurrentTx,
                        txInCost: txShareCostUsd,
                        pnl: fairMarketValue.sub(activeTxIn.txRate).mul(volumeOnCurrentTx),
                    };
                    await this.costsBasisLotDbDao.createTransactionCostsBasisLot(lot);

                    // increment TX out cost basis
                    costBasis.totalVolume = costBasis.totalVolume.sub(volumeOnCurrentTx);
                    costBasis.totalCostUsd = costBasis.totalCostUsd.sub(volumeOnCurrentTx.mul(activeTxIn.txRate));
                    costBasis.txPnl = costBasis.txPnl!.add(lot.pnl);

                    // mutate volume of active TX before next loop
                    activeTxIn.txVolume = activeTxIn.txVolume.sub(volumeOnCurrentTx);
                }

                // store computed cost basis
                await this.costsBasisDbDao.createTransactionCostBasis(costBasis);

                lastCostBasis = {
                    totalVolume: costBasis.totalVolume,
                    totalCostUsd: costBasis.totalCostUsd,
                };
            }

        });
    }

    public async readComputedTransactionsCostBasisFromLots(): Promise<ITransactionsCostBasisReader> {
        return this.costsBasisLotDbDao.readComputedTransactionsCostBasisFromLots();
    }
}
