import { pino } from 'pino';

import { IConfig } from '../config/default';
import { PostgresAccess } from './common/postgres/index';
import { TransactionsDbDao } from './transactions/TransactionsDbDao';
import { TransactionsService } from './transactions/TransactionsService';

const logger = pino();

export class Application {

    private readonly config: IConfig;
    private readonly postgresAccess: PostgresAccess;
    private readonly transactionsDbDao: TransactionsDbDao;
    private readonly transactionsService: TransactionsService;

    constructor(config: IConfig) {
        this.config = config;
        this.postgresAccess = new PostgresAccess(this.config.postgres);

        this.transactionsDbDao = new TransactionsDbDao(this.postgresAccess);
        this.transactionsService = new TransactionsService(this.transactionsDbDao);

    }

    public async init(): Promise<void> {
        await this.transactionsDbDao.init();
    }

    public async destroy(): Promise<void> {
        logger.info('Disconnect db');
        await this.postgresAccess.disconnect();
    }
}
