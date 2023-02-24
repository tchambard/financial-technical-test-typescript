import { IPostgresConfig, PostgresAccess } from '../lib/common/postgres/index';

export class PostgresTestHelper {
    public readonly db: PostgresAccess;
    private readonly config: IPostgresConfig;
    private readonly schemaName: string;
    private readonly tableNames: string[];

    constructor(config: IPostgresConfig, schemaName: string, tableNames: string[]) {
        this.config = config;
        this.schemaName = schemaName;
        this.tableNames = tableNames;
        this.db = new PostgresAccess(this.config);
    }

    public async init(): Promise<void> {
        await this.dropDatabase();
        await this.createDatabase();
    }

    public async destroy(): Promise<void> {
        await this.dropDatabase();
        await this.db.adminDb.disconnect();
    }

    public async reset(): Promise<void> {
        await this.clearTables();
    }

    private async createDatabase(): Promise<void> {
        await this.db.adminDb.query({ text: `CREATE DATABASE "${this.config.db.database}";` }, { doesNotThrow: true });
        await this.db.db.query({ text: `CREATE SCHEMA IF NOT EXISTS alpha;` });
    }

    private async dropDatabase(): Promise<void> {
        await this.db.db.disconnect();
        await this.db.adminDb.query({ text: `DROP DATABASE "${this.config.db.database}"` }, { doesNotThrow: true });
    }

    private async clearTables(): Promise<void> {
        for (const tableName of this.tableNames) {
            await this.db.db.query({ text: `DELETE FROM ${this.schemaName}.${tableName};` }, { doesNotThrow: true });
        }
    }
}
