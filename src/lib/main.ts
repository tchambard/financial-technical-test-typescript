import { pino } from 'pino';

import { defaultConfig, IConfig } from '../config/default';
import { PostgresAccess } from './common/postgres/PostgresAccess';

const logger = pino();
const config: IConfig = process.env.CONF_FILE ? require(process.env.CONF_FILE as string) : defaultConfig;

async function initDb(): Promise<() => Promise<void>> {
    logger.info('Initialize db connection');
    const postgresAccess = new PostgresAccess(config.postgres);
    // TODO: initialize daos

    return async () => {
        logger.info('Disconnect db');
        await postgresAccess.disconnect();
    };
}

async function main(): Promise<void> {
    logger.info('Starting...');
    const disconnectDb = await initDb();
    // TODO: Finance Technical Test
    await disconnectDb();

}

main().catch((e) => {
    logger.error(`An error occurred: ${e.stack}`);
});
