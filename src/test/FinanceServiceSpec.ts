import * as BN from 'bn.js';
import { assert } from 'chai';

import { IConfig } from '../config/default';
import { FinanceService } from '../lib/transactions/FinanceService';
import { TRANSACTIONS_COST_BASIS_TABLE_NAME, TransactionsCostBasisDbDao } from '../lib/transactions/TransactionsCostBasisDbDao';
import { TRANSACTIONS_COST_BASIS_LOT_TABLE_NAME, TransactionsCostBasisLotDbDao } from '../lib/transactions/TransactionsCostBasisLotDbDao';
import { TRANSACTIONS_SCHEMA_NAME, TRANSACTIONS_TABLE_NAME, TransactionsDbDao } from '../lib/transactions/TransactionsDbDao';
import { ITransactionData, TransactionDirection } from '../lib/types/transactions';
import { PostgresTestHelper } from './PostgresTestHelper';

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

    context('> db contains three simple transactions', () => {
        beforeEach(async () => {
            await postgresTestHelper.reset();

            const simple_tx_sample: ITransactionData[] = [{
                date: new Date('2021-01-01'),
                direction: TransactionDirection.IN,
                volume: new BN(1),
                rate: new BN(100),
            }, {
                date: new Date('2021-01-02'),
                direction: TransactionDirection.IN,
                volume: new BN(1),
                rate: new BN(120),
            }, {
                date: new Date('2021-01-03'),
                direction: TransactionDirection.OUT,
                volume: new BN(2),
                rate: new BN(250),
            }];

            for (const t of simple_tx_sample) {
                await financeService.createTransaction(t);
            }
        });

        describe('> computeCostsBasis', () => {
            it('> should create cost basis entries and corresponding lots', async () => {
                await financeService.computeCostsBasis();

                const txCostBasisStored = await (await financeService.readAllTransactionsCostBasis()).reader.toArray();
                assert.sameDeepOrderedMembers(txCostBasisStored, [{
                    txId: 1,
                    totalVolume: new BN(1),
                    totalCostUsd: new BN(100),
                    txPnl: new BN(0),
                }, {
                    txId: 2,
                    totalVolume: new BN(2),
                    totalCostUsd: new BN(220),
                    txPnl: new BN(0),
                }, {
                    txId: 3,
                    totalVolume: new BN(0),
                    totalCostUsd: new BN(0),
                    txPnl: new BN(30),
                }]);

                const txCostBasisLotStored = await (await financeService.readAllTransactionsCostBasisLots()).reader.toArray();
                assert.sameDeepOrderedMembers(txCostBasisLotStored, [{
                    txOutId: 3,
                    txInId: 1,
                    pnl: new BN(25),
                }, {
                    txOutId: 3,
                    txInId: 2,
                    pnl: new BN(5),
                }]);
            });
        });
    });
});
