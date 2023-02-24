import { PoolConfig } from 'pg';

export interface IPostgresConfig {
    adminDb: PoolConfig;
    db: PoolConfig;
}

export interface IConfig {
    postgres: IPostgresConfig;
}

export const defaultConfig: IConfig = {
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
