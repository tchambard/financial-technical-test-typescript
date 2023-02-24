import { IPostgresConfig, PostgresDb } from './PostgresDb';

export class PostgresAccess {
    private config: IPostgresConfig;
    private _adminDb: PostgresDb;
    private _db: PostgresDb;

    constructor(config: IPostgresConfig) {
        this.config = config;
    }

    public get adminDb(): PostgresDb {
        if (!this._adminDb) {
            this._adminDb = new PostgresDb(this.config.adminDb);
        }
        return this._adminDb;
    }

    public get db(): PostgresDb {
        if (!this._db) {
            this._db = new PostgresDb(this.config.db);
        }
        return this._db;
    }

    public async disconnect(): Promise<void> {
        await this.adminDb.disconnect();
        await this.db.disconnect();
    }

}
