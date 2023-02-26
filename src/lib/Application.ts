import { pino } from 'pino';

import { IConfig } from '../config/default';
import { PostgresAccess } from './common/postgres/index';
import { FinanceService } from './transactions/FinanceService';
import { TransactionsCostBasisDbDao } from './transactions/TransactionsCostBasisDbDao';
import { TransactionsCostBasisLotDbDao } from './transactions/TransactionsCostBasisLotDbDao';
import { TransactionsDbDao } from './transactions/TransactionsDbDao';

const logger = pino();

export class Application {

    private readonly config: IConfig;
    private readonly postgresAccess: PostgresAccess;
    private readonly transactionsDbDao: TransactionsDbDao;
    private readonly transactionsService: FinanceService;
    private readonly costsBasisDbDao: TransactionsCostBasisDbDao;
    private readonly costsBasisLotDbDao: TransactionsCostBasisLotDbDao;

    constructor(config: IConfig) {
        this.config = config;
        this.postgresAccess = new PostgresAccess(this.config.postgres);

        this.transactionsDbDao = new TransactionsDbDao(this.postgresAccess);
        this.costsBasisDbDao = new TransactionsCostBasisDbDao(this.postgresAccess);
        this.costsBasisLotDbDao = new TransactionsCostBasisLotDbDao(this.postgresAccess);
        this.transactionsService = new FinanceService(this.transactionsDbDao, this.costsBasisDbDao, this.costsBasisLotDbDao);
    }

    public async init(): Promise<void> {
        await this.transactionsDbDao.init();
        await this.costsBasisDbDao.init();
        await this.costsBasisLotDbDao.init();
    }

    public async destroy(): Promise<void> {
        logger.info('Disconnect db');
        await this.postgresAccess.disconnect();
    }
}
