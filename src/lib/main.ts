import { pino } from 'pino';

import { defaultConfig, IConfig } from '../config/default';
import { Application } from './Application';

const logger = pino();
const config: IConfig = process.env.CONF_FILE ? require(process.env.CONF_FILE as string) : defaultConfig;

async function main(): Promise<void> {
    logger.info('Starting...');
    const app = new Application(config);
    try {
        await app.init();
        // TODO: Finance Technical Test
    } finally {
        await app.destroy();
    }
}

main().catch((e) => {
    logger.error(`An error occurred: ${e.stack}`);
});
