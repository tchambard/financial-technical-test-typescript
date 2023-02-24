import { PostgresAbstractDao, PostgresAccess, PostgresError } from '../common/postgres';
import { ITransactionData, ITransactionModel, ITransactionsReader } from '../types/transactions';
import {
    ITransactionDbModel,
    TRANSACTIONS_FULL_TABLE_NAME,
    TRANSACTIONS_SCHEMA_NAME,
    TRANSACTIONS_TABLE_NAME,
    TransactionsDbMapper,
    TransactionsFields,
} from './TransactionsDbMapper';

export class TransactionsDbDao extends PostgresAbstractDao<ITransactionDbModel> {

    constructor(postgresAccess: PostgresAccess) {
        super(postgresAccess, TRANSACTIONS_SCHEMA_NAME, TRANSACTIONS_TABLE_NAME);
    }

    public async createTransaction(transaction: ITransactionData): Promise<ITransactionModel> {
        return this.queryFirst<ITransactionModel>({
            name: 'transactions_insert',
            text: `INSERT INTO ${TRANSACTIONS_FULL_TABLE_NAME} (${TransactionsFields.DATE}, 
                    ${TransactionsFields.DIRECTION}, ${TransactionsFields.VOLUME}, ${TransactionsFields.RATE})
                VALUES ($1, $2, $3, $4)
                RETURNING *;`,
            values: [
                transaction.date.toISOString(),
                transaction.direction,
                transaction.volume,
                transaction.rate,
            ],
        }, TransactionsDbMapper.fromDbModel);
    }

    public async getTransactionById(id: string): Promise<ITransactionModel> {
        try {
            return await this.find<ITransactionModel>({
                name: 'transactions_select_by_id',
                text: `SELECT * FROM ${TRANSACTIONS_FULL_TABLE_NAME} WHERE ${TransactionsFields.ID} = $1`,
                values: [id],
            }, TransactionsDbMapper.fromDbModel);
        } catch (e) {
            if (e instanceof PostgresError && e.code === PostgresError.CODES.NOT_FOUND) {
                throw new PostgresError(PostgresError.CODES.NOT_FOUND, 'not found', `Transaction not found with id '${id}'`);
            }
            throw e;
        }
    }

    public async readAllTransactions(): Promise<ITransactionsReader> {
        return this.read<ITransactionModel>({
            text: `SELECT * FROM ${TRANSACTIONS_FULL_TABLE_NAME};`,
        }, TransactionsDbMapper.fromDbModel);
    }

    protected async _init(): Promise<void> {
        await this.access.db.query({
            name: 'transactions_create_table',
            text: `CREATE TABLE IF NOT EXISTS ${TRANSACTIONS_FULL_TABLE_NAME} (
                -- Unique identifier for the transaction
                ${TransactionsFields.ID} serial not null primary key,
            
                -- Date at which the transaction happened
                ${TransactionsFields.DATE} text not null,
            
                -- Whether money is being received, or spent
                ${TransactionsFields.DIRECTION} text check ( direction in ('in', 'out') ) not null,
            
                -- Amount of crypto transferred
                ${TransactionsFields.VOLUME} real not null,
            
                -- Rate between
                ${TransactionsFields.RATE} real not null
            );`,
        });
    }
}
