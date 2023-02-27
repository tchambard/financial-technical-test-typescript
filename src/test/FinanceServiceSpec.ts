import * as BN from 'bn.js';
import { assert } from 'chai';

import { IConfig } from '../config/default';
import { PostgresTestHelper } from '../lib/common/postgres/PostgresTestHelper';
import { FinanceService } from '../lib/transactions/FinanceService';
import { TRANSACTIONS_COST_BASIS_TABLE_NAME, TransactionsCostBasisDbDao } from '../lib/transactions/TransactionsCostBasisDbDao';
import { TRANSACTIONS_COST_BASIS_LOT_TABLE_NAME, TransactionsCostBasisLotDbDao } from '../lib/transactions/TransactionsCostBasisLotDbDao';
import { TRANSACTIONS_SCHEMA_NAME, TRANSACTIONS_TABLE_NAME, TransactionsDbDao } from '../lib/transactions/TransactionsDbDao';
import { ITransactionData, TransactionDirection } from '../lib/types/transactions';
import { ITransactionCostBasisModel } from '../lib/types/transactionsCostBasis';

const config: IConfig = require('../config/config_test.js');

const postgresTestHelper = new PostgresTestHelper({
    adminDb: config.postgres.adminDb,
    db: config.postgres.db,
}, TRANSACTIONS_SCHEMA_NAME, [TRANSACTIONS_TABLE_NAME, TRANSACTIONS_COST_BASIS_TABLE_NAME, TRANSACTIONS_COST_BASIS_LOT_TABLE_NAME]);

describe('> FinanceService', function () {
    this.timeout(60000);

    let financeService: FinanceService;

    before(async () => {
        await postgresTestHelper.init();
        const transactionDao = new TransactionsDbDao(postgresTestHelper.db);
        const costsBasisDao = new TransactionsCostBasisDbDao(postgresTestHelper.db);
        const costsBasisLotDao = new TransactionsCostBasisLotDbDao(postgresTestHelper.db);

        financeService = new FinanceService(transactionDao, costsBasisDao, costsBasisLotDao);

        await transactionDao.init();
        await costsBasisDao.init();
        await costsBasisLotDao.init();
    });

    after(async () => {
        await postgresTestHelper.destroy();
    });

    context('> db contains simple transactions', () => {
        beforeEach(async () => {
            await postgresTestHelper.reset();

            const simple_tx_sample: ITransactionData[] = [{
                date: new Date('2021-01-01'),
                direction: TransactionDirection.IN,
                volume: new BN(4),
                rate: new BN(100),
            }, {
                date: new Date('2021-01-01'),
                direction: TransactionDirection.OUT,
                volume: new BN(1),
                rate: new BN(90),
            }, {
                date: new Date('2021-01-02'),
                direction: TransactionDirection.IN,
                volume: new BN(1),
                rate: new BN(80),
            }, {
                date: new Date('2021-01-03'),
                direction: TransactionDirection.OUT,
                volume: new BN(1),
                rate: new BN(120),
            }, {
                date: new Date('2021-02-03'),
                direction: TransactionDirection.OUT,
                volume: new BN(3),
                rate: new BN(130),
            }];

            for (const t of simple_tx_sample) {
                await financeService.createTransaction(t);
            }
        });

        describe('> computeCostsBasis', () => {
            it('> should create cost basis entries and corresponding lots', async () => {
                await financeService.computeCostsBasis();

                const txCostBasisStored = await (await financeService.readAllTransactionsCostBasis()).reader.toArray();
                const expectedTxCostBasis: ITransactionCostBasisModel[] = [{
                    txId: 1,
                    totalVolume: new BN(4),
                    totalCostUsd: new BN(400),
                    txPnl: new BN(0),
                }, {
                    txId: 2,
                    totalVolume: new BN(3),
                    totalCostUsd: new BN(300),
                    txPnl: new BN(-10),
                }, {
                    txId: 3,
                    totalVolume: new BN(4),
                    totalCostUsd: new BN(380),
                    txPnl: new BN(0),
                }, {
                    txId: 4,
                    totalVolume: new BN(3),
                    totalCostUsd: new BN(280),
                    txPnl: new BN(20),
                }, {
                    txId: 5,
                    totalVolume: new BN(0),
                    totalCostUsd: new BN(0),
                    txPnl: new BN(110),
                }];

                assert.sameDeepOrderedMembers(txCostBasisStored, expectedTxCostBasis);
                const txCostBasisLotStored = await (await financeService.readAllTransactionsCostBasisLots()).reader.toArray();

                assert.sameDeepOrderedMembers(txCostBasisLotStored, [{
                    txOutId: 2,
                    txInId: 1,
                    txInVolume: new BN(1),
                    txInCost: new BN(100),
                    pnl: new BN(-10),
                }, {
                    txOutId: 4,
                    txInId: 1,
                    txInVolume: new BN(1),
                    txInCost: new BN(100),
                    pnl: new BN(20),
                }, {
                    txOutId: 5,
                    txInId: 1,
                    txInVolume: new BN(2),
                    txInCost: new BN(200),
                    pnl: new BN(60),
                }, {
                    txOutId: 5,
                    txInId: 3,
                    txInVolume: new BN(1),
                    txInCost: new BN(80),
                    pnl: new BN(50),
                }]);

                const txCostBasisComputedFromLots = await (await financeService.readComputedTransactionsCostBasisFromLots()).reader.toArray();

                assert.sameDeepOrderedMembers(txCostBasisComputedFromLots, expectedTxCostBasis);

                assert.sameDeepOrderedMembers(txCostBasisComputedFromLots, txCostBasisStored);

            });
        });
    });
});
