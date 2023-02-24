import { PoolConfig } from 'pg';
import { Level } from 'pino';

export interface ILogger {
    level: Level;
}

export interface IPostgresConfig {
    adminDb: PoolConfig;
    db: PoolConfig;
}

export interface IConfig {
    logger: ILogger;
    postgres: IPostgresConfig;
}

export const defaultConfig: IConfig = {
    logger: {
        level: 'info',
    },
    postgres: {
        adminDb: {
            host: 'localhost',
            port: 5432,
            database: 'postgres',
            user: 'postgres',
            password: 'test',
            max: 1,
        },
        db: {
            host: 'localhost',
            port: 5432,
            database: 'financial',
            user: 'postgres',
            password: 'test',
            max: 16,
        },
    },
};
