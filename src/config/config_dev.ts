import * as _ from 'lodash';

import { defaultConfig, IConfig } from './default';

const override: Partial<IConfig> = {
    logger: {
        level: 'info',
    },
    postgres: {
        adminDb: {
            host: 'financial.docker.net',
            port: 5432,
            database: 'postgres',
            user: 'postgres',
            password: 'test',
            max: 1,
        },
        db: {
            host: 'financial.docker.net',
            port: 5432,
            database: 'financial',
            user: 'postgres',
            password: 'test',
            max: 32,
        },
    },
};

export = _.defaultsDeep(override, defaultConfig);
