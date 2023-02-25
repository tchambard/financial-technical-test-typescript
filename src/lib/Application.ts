import { pino } from 'pino';

import { IConfig } from '../config/default';
import { PostgresAccess } from './common/postgres/index';
import { FinanceService } from './transactions/FinanceService';
import { TransactionsDbDao } from './transactions/TransactionsDbDao';

const logger = pino();

export class Application {

    private readonly config: IConfig;
    private readonly postgresAccess: PostgresAccess;
    private readonly transactionsDbDao: TransactionsDbDao;
    private readonly transactionsService: FinanceService;

    constructor(config: IConfig) {
        this.config = config;
        this.postgresAccess = new PostgresAccess(this.config.postgres);

        this.transactionsDbDao = new TransactionsDbDao(this.postgresAccess);
        this.transactionsService = new FinanceService(this.transactionsDbDao);

    }

    public async init(): Promise<void> {
        await this.transactionsDbDao.init();
    }

    public async destroy(): Promise<void> {
        logger.info('Disconnect db');
        await this.postgresAccess.disconnect();
    }
}
