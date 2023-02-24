import * as _ from 'lodash';

import { defaultConfig, IConfig, IPostgresConfig } from './default';

const override: Partial<IConfig> = {
    postgres: {
        db: {
            database: 'financial_test',
        },
    } as IPostgresConfig,
};

export = _.defaultsDeep(override, defaultConfig);
