import * as BN from 'bn.js';
import { assert } from 'chai';

import { IConfig } from '../config/default';
import { PostgresTestHelper } from '../lib/common/postgres/PostgresTestHelper';
import { TRANSACTIONS_SCHEMA_NAME, TRANSACTIONS_TABLE_NAME, TransactionsDbDao } from '../lib/transactions/TransactionsDbDao';
import { ITransactionData, ITransactionModel, TransactionDirection } from '../lib/types/transactions';
import { transactionsFixtures } from './__fixtures/transactions_data';

const config: IConfig = require('../config/config_test.js');

const transactions_sample = transactionsFixtures();

const postgresTestHelper = new PostgresTestHelper({
    adminDb: config.postgres.adminDb,
    db: config.postgres.db,
}, TRANSACTIONS_SCHEMA_NAME, [TRANSACTIONS_TABLE_NAME]);

describe('> TransactionsDbDao', function () {
    this.timeout(60000);

    function assertTransactionEqual(transaction: ITransactionModel, expectedTransaction: ITransactionModel): void {
        assert.isDefined(transaction.id);
        assert.equal(transaction.id, expectedTransaction.id);
        assert.equal(transaction.date.toISOString(), expectedTransaction.date.toISOString());
        assert.equal(transaction.direction, expectedTransaction.direction);
        assert.equal(transaction.volume.toString(), expectedTransaction.volume.toString());
        assert.equal(transaction.rate.toString(), expectedTransaction.rate.toString());
    }

    let transactionDao: TransactionsDbDao;

    before(async () => {
        await postgresTestHelper.init();
        transactionDao = new TransactionsDbDao(postgresTestHelper.db);
        await transactionDao.init();
    });

    after(async () => {
        await postgresTestHelper.destroy();
    });

    context('> db is empty', () => {

        beforeEach(async () => {
            await postgresTestHelper.reset();
        });

        describe('> insertTransaction', () => {
            it('> shoud insert new record', async () => {
                const transaction: ITransactionData = {
                    date: new Date('2023/01/01'),
                    direction: TransactionDirection.IN,
                    volume: new BN(5),
                    rate: new BN(6.0),
                };
                const createdTransaction = await transactionDao.createTransaction(transaction);
                assertTransactionEqual(createdTransaction, { ...transaction, id: createdTransaction.id } as ITransactionModel);
            });
        });

        describe('> readAllTransactions', () => {
            it('> should return empty reader', async () => {
                const { length, reader } = await transactionDao.readAllTransactions();
                assert.equal(length, 0);
                assert.isEmpty(reader.toArray());
            });
        });

    });

    context('> db contains many transactions', () => {
        beforeEach(async () => {
            await postgresTestHelper.reset();

            for (const t of transactions_sample) {
                await transactionDao.createTransaction(t);
            }
        });

        describe('> readAllTransactions', () => {
            it('> should return created transactions', async () => {
                const { length, reader } = await transactionDao.readAllTransactions();
                assert.equal(length, transactions_sample.length);
                await reader.forEach((transaction, idx) => {
                    assertTransactionEqual(transaction, { ...transactions_sample[idx], id: transaction.id });
                });
            });
        });
    });
});
