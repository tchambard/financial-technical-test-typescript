import * as _ from 'lodash';
import { QueryConfig, QueryResultRow } from 'pg';

import { IReader } from '../../types/common';
import { PostgresAccess } from './PostgresAccess';
import { PostgresError } from './PostgresError';

export interface IInsertManyQueryConfig extends QueryConfig {
    columns: string[];
}

export abstract class PostgresAbstractDao<DbModel extends QueryResultRow> {

    protected access: PostgresAccess;
    protected readonly schemaName: string;
    protected readonly tableName: string;

    constructor(postgresAccess: PostgresAccess, schemaName: string, tableName: string) {
        this.access = postgresAccess;
        this.schemaName = schemaName;
        this.tableName = tableName;
    }

    public async init(): Promise<void> {
        await this.access.adminDb.query({ text: `CREATE DATABASE "${this.access.db.config.database}";` }, { doesNotThrow: true });
        await this.access.db.query({ text: `CREATE SCHEMA IF NOT EXISTS ${this.schemaName};` });
        await this.access.db.query({ text: 'CREATE EXTENSION IF NOT EXISTS "pgcrypto";' });
        await this.access.db.query({ text: 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";' });

        await this._init();
    }

    protected async queryFirst<T>(query: QueryConfig, mapFn: (dbModel: DbModel) => T): Promise<T> {
        return mapFn((await this.access.db.query<DbModel>(query))!.rows[0]);
    }

    protected async insertMany<T>(insertQuery: IInsertManyQueryConfig, mapFn: (dbModel: T) => Partial<DbModel>): Promise<number> {
        if (!insertQuery.values || !insertQuery.text) {
            throw new PostgresError(PostgresError.CODES.INVALID_INPUT, 'Missing values or text for insertMany');
        }
        if (insertQuery.text.indexOf('$$') === -1) {
            throw new PostgresError(PostgresError.CODES.INVALID_INPUT, 'Missing special placeholder $$ for insertMany');
        }
        if (insertQuery.values.length === 0) {
            return 0;
        }

        const values = insertQuery.values.reduce((acc, curr) => {
            const mappedValue = mapFn(curr);
            acc.push(insertQuery.columns.map((c) => {
                let val = _.get(mappedValue, c);
                if (Array.isArray(val)) val = JSON.stringify(val) as any;
                return val;
            }));
            return acc;
        }, []);

        const placeholders = this.generatePlaceholders(values.length, insertQuery.columns.length);
        const query: QueryConfig = {
            text: insertQuery.text.replace('$$', placeholders),
            values: values.flat(),
        };
        return (await this.access.db.query<DbModel>(query))!.rowCount;
    }

    protected async query(query: QueryConfig): Promise<void> {
        await this.access.db.query<DbModel>(_.omitBy(query, _.isUndefined) as QueryConfig);
    }

    protected async find<T>(query: QueryConfig, mapFn: (dbModel: DbModel) => T): Promise<T> {
        const res = await this.access.db.query<DbModel>(query);
        if (res?.rowCount === 0) {
            throw new PostgresError(PostgresError.CODES.NOT_FOUND, 'not found');
        }
        if (res?.rowCount && res?.rowCount > 1) {
            throw new PostgresError(PostgresError.CODES.MULTIPLE_RECORDS, 'multiple records');
        }
        return mapFn(res!.rows[0]);
    }

    protected async list<T, M extends DbModel = DbModel>(query: QueryConfig, mapFn: (dbModel: M, index: number) => T): Promise<T[]> {
        const res = await this.access.db.query<M>(query);
        return res!.rows.map(mapFn);
    }

    protected async count(query: QueryConfig): Promise<number> {
        const res = await this.access.db.query<{ count: number }>(query);
        const count = res?.rows[0].count;
        return count != null ? +count : 0;
    }

    protected async read<T>(query: QueryConfig, mapFn: (dbModel: DbModel) => T): Promise<IReader<T>> {
        const result = await this.access.db.read(query);
        return {
            reader: result.reader.map(mapFn),
            length: result.length,
        };
    }

    protected abstract _init(): Promise<void>;

    private generatePlaceholders(rowCount: number, columnCount: number): string {
        let idx = 1;
        return Array(rowCount).fill(0).map(_v => `(${Array(columnCount).fill(0).map(_vv => `$${idx++}`).join(', ')})`).join(', ');
    }
}
