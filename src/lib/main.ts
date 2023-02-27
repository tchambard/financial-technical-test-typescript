/* eslint-disable no-console */
import * as BN from 'bn.js';
import { pino } from 'pino';
import * as yargs from 'yargs';

import { defaultConfig, IConfig } from '../config/default';
import { Application } from './Application';
import { PostgresTestHelper } from './common/postgres/PostgresTestHelper';
import { TRANSACTIONS_COST_BASIS_TABLE_NAME } from './transactions/TransactionsCostBasisDbDao';
import { TRANSACTIONS_COST_BASIS_LOT_TABLE_NAME } from './transactions/TransactionsCostBasisLotDbDao';
import { TRANSACTIONS_SCHEMA_NAME, TRANSACTIONS_TABLE_NAME } from './transactions/TransactionsDbDao';
import { ITransactionData, mapTransactionPrintable, TransactionDirection } from './types/transactions';
import { mapTransactionCostBasisPrintable } from './types/transactionsCostBasis';
import { mapTransactionCostBasisLotPrintable } from './types/transactionsCostBasisLot';

const logger = pino();
const config: IConfig = process.env.CONF_FILE ? require(process.env.CONF_FILE as string) : defaultConfig;

const startServiceAndExecute = async (fn: (app: Application) => Promise<void>) => {
    const app = new Application(config);
    try {
        await app.init();
        await fn(app);
    } finally {
        await app.destroy();
    }
};

(async (): Promise<void> => {

    const argv = await yargs

        .command('import_transactions', 'Import transactions',
            (args: yargs.Argv) => args, async (_argv: yargs.Arguments) => {

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

                await startServiceAndExecute(async (app) => {
                    for (const t of simple_tx_sample) {
                        await app.financeService.createTransaction(t);
                    }
                    const transactionsStored = await (await app.financeService.readAllTransactions())
                        .reader.map(mapTransactionPrintable)
                        .toArray();
                    console.log(`============== TRANSACTIONS ===============`);
                    console.table(transactionsStored);
                });
            })

        .command('compute_cost_basis', 'Compute costs basis and lots',
            (args: yargs.Argv) => args, async (_argv: yargs.Arguments) => {
                await startServiceAndExecute(async (app) => {
                    await app.financeService.computeCostsBasis();

                    const txCostBasisStored = await (await app.financeService.readAllTransactionsCostBasis())
                        .reader.map(mapTransactionCostBasisPrintable)
                        .toArray();
                    console.log(`============== COST BASIS ===============`);
                    console.table(txCostBasisStored);

                    const txCostBasisLotsStored = await (await app.financeService.readAllTransactionsCostBasisLots())
                        .reader.map(mapTransactionCostBasisLotPrintable)
                        .toArray();
                    console.log(`============== COST BASIS LOTS ===============`);
                    console.table(txCostBasisLotsStored);

                    const txCostBasisComputedFromLots = await (await app.financeService.readComputedTransactionsCostBasisFromLots())
                        .reader.map(mapTransactionCostBasisPrintable)
                        .toArray();
                    console.log(`============== COST BASIS COMPUTED FROM LOTS ===============`);
                    console.table(txCostBasisComputedFromLots);
                });
            })

        .command('reset_database', 'Reset database',
            (args: yargs.Argv) => args, async (_argv: yargs.Arguments) => {

                const postgresTestHelper = new PostgresTestHelper({
                    adminDb: config.postgres.adminDb,
                    db: config.postgres.db,
                }, TRANSACTIONS_SCHEMA_NAME, [TRANSACTIONS_TABLE_NAME, TRANSACTIONS_COST_BASIS_TABLE_NAME, TRANSACTIONS_COST_BASIS_LOT_TABLE_NAME]);

                await postgresTestHelper.reset();
                await postgresTestHelper.destroy();
            })
        .strict(true)
        .usage('Usage: $0 <command>')
        .help('help')
        .locale('en')
        .argv;

    if (!argv._.length) {
        yargs.showHelp();
        process.exit(1);
    }
    process.exit(0);
})().catch((e) => {
    logger.error(e.stack);
    process.exit(1);
});
