import { wait } from 'f-promise-async';
import { genericReader, Reader, Writer } from 'f-streams-async';
import { ClientConfig as PostgresClientConfig, Pool, PoolClient, QueryConfig, QueryResult, QueryResultRow } from 'pg';
import * as Cursor from 'pg-cursor';
import { pino } from 'pino';

import { IReader } from '../../types/Common';
import { PostgresError } from './PostgresError';

export type IPostgresClientConfig = PostgresClientConfig;

export interface IPostgresConfig {
    adminDb: IPostgresClientConfig;
    db: IPostgresClientConfig;
}

const logger = pino();

export interface IPostgresQueryOptions {
    doesNotThrow?: boolean;
}

export interface IPostgresReaderOptions {
    size?: number;
}

export class PostgresDb {
    public readonly config: IPostgresClientConfig;
    private _pool: Pool | null;

    constructor(config: IPostgresClientConfig) {
        this.config = config;
    }

    public get pool(): Pool {
        if (!this._pool) {
            this._pool = new Pool(this.config);
            this.pool.on('error', (err, client) => {
                logger.error('Unexpected error on idle client in pg pool', err.message);
            });
        }
        return this._pool;
    }

    public async query<R extends QueryResultRow, I extends any[] = any[]>(
        queryConfig: QueryConfig<I>,
        options?: IPostgresQueryOptions,
    ): Promise<QueryResult<R> | undefined> {

        let client: PoolClient | undefined;
        try {
            client = await this.pool.connect();
            logger.debug(`exec pg query > "${queryConfig.text}" with values "${JSON.stringify(queryConfig.values)}"`);
            const r = await client.query<R>(queryConfig);
            client.release();
            return r;
        } catch (e) {
            // console.log(`message=${e.message}, detail=${e.detail}, stack=${e.stack}`);
            client?.release(e);
            if (options?.doesNotThrow) return;
            throw new PostgresError(e.code, e.message, e.detail);
        }
    }

    public async read<R extends QueryResultRow, I extends any[] = any[]>(
        queryConfig: QueryConfig<I>,
        options?: IPostgresReaderOptions,
    ): Promise<IReader<R>> {

        if (!queryConfig.text.startsWith('SELECT ')) {
            throw new PostgresError(PostgresError.CODES.INVALID_INPUT, 'Cursor query MUST starts with SELECT keyword');
        }
        const query = queryConfig.text.replace(/ FROM/, ', count(1) OVER () as __count__ FROM');
        const client = await this.pool.connect();
        const cursor = client.query(new Cursor(query, queryConfig.values));
        logger.debug(`exec pg cursor > "${query}" with values "${JSON.stringify(queryConfig.values)}"`);

        let released = false;
        const release = (e?: Error) => {
            if (!released) {
                released = true;
                client.release(e);
            }
        };

        const reader = genericReader<R[]>(async () => {
            return wait(cb => cursor.read(options?.size || 100, cb));
        }, async (e?: Error) => {
            release(e);
        }).transform(async (_reader: Reader<R[]>, _writer: Writer<R>) => {
            try {
                let chunks = await _reader.read() as R[];
                while (chunks.length > 0) {
                    for (const chunk of chunks) {
                        await _writer.write(chunk);
                    }
                    chunks = await _reader.read() as R[];
                }
                await _reader.stop();
                await _writer.write(undefined);
            } catch (e) {
                await _reader.stop();
                throw e;
            }
        }).peekable();

        reader._stop = async (e) => {
            await wait(cb => cursor.close(cb));
            release(e);
        };
        const length = (await reader.peek())?.__count__ || 0;
        return { reader, length };
    }

    public async disconnect(): Promise<void> {
        if (this._pool) {
            await this._pool.end();
            this._pool = null;
            logger.info(`Postgresql ${this.config.database} connection closed successfully`);
        }
    }
}
