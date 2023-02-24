import { assert } from 'chai';

import { IConfig } from '../config/default';
import { TransactionsDbDao } from '../lib/transactions/TransactionsDbDao';
import { TRANSACTIONS_SCHEMA_NAME, TRANSACTIONS_TABLE_NAME } from '../lib/transactions/TransactionsDbMapper';
import { TransactionsService } from '../lib/transactions/TransactionsService';
import { ITransactionData, ITransactionModel, TransactionDirection } from '../lib/types/transactions';
import { transactionsFixtures } from './__fixtures/transactions_data';
import { PostgresTestHelper } from './PostgresTestHelper';

const config: IConfig = require('../config/config_test.js');

const transactions_sample = transactionsFixtures();

const postgresTestHelper = new PostgresTestHelper({
    adminDb: config.postgres.adminDb,
    db: config.postgres.db,
}, TRANSACTIONS_SCHEMA_NAME, [TRANSACTIONS_TABLE_NAME, TRANSACTIONS_TABLE_NAME]);

describe('> TransactionDbDao', function () {
    this.timeout(60000);

    function assertTransactionEqual(transaction: ITransactionModel, expectedTransaction: ITransactionModel): void {
        assert.isDefined(transaction.id);
        assert.equal(transaction.id, expectedTransaction.id);
        assert.equal(transaction.date.toISOString(), expectedTransaction.date.toISOString());
        assert.equal(transaction.direction, expectedTransaction.direction);
        assert.equal(transaction.volume, expectedTransaction.volume);
        assert.equal(transaction.rate, expectedTransaction.rate);
    }

    let transactionService: TransactionsService;

    before(async () => {
        await postgresTestHelper.init();
        const transactionDao = new TransactionsDbDao(postgresTestHelper.db);
        await transactionDao.init();
        transactionService = new TransactionsService(transactionDao);
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
                    volume: 5,
                    rate: 6.0,
                };
                const createdTransaction = await transactionService.createTransaction(transaction);
                assertTransactionEqual(createdTransaction, { ...transaction, id: createdTransaction.id } as ITransactionModel);
            });
        });

        describe('> readAllTransactions', () => {
            it('> should return empty reader', async () => {
                const { length, reader } = await transactionService.readAllTransactions();
                assert.equal(length, 0);
                assert.isEmpty(reader.toArray());
            });
        });

    });

    context('> db contains many transactions', () => {
        beforeEach(async () => {
            await postgresTestHelper.reset();

            for (const t of transactions_sample) {
                await transactionService.createTransaction(t);
            }
        });

        describe('> readAllTransactions', () => {
            it('> should return created transactions', async () => {
                const { length, reader } = await transactionService.readAllTransactions();
                assert.equal(length, transactions_sample.length);
                await reader.forEach((transaction, idx) => {
                    assertTransactionEqual(transaction, { ...transactions_sample[idx], id: transaction.id });
                });
            });
        });
    });
});
