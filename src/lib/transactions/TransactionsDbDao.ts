import * as BN from 'bn.js';

import { PostgresAbstractDao, PostgresAccess, PostgresError } from '../common/postgres';
import { ITransactionData, ITransactionModel, ITransactionsReader, TransactionDirection } from '../types/transactions';

export const TRANSACTIONS_SCHEMA_NAME = 'financial';
export const TRANSACTIONS_TABLE_NAME = 'transactions';
export const TRANSACTIONS_FULL_TABLE_NAME = `${TRANSACTIONS_SCHEMA_NAME}.${TRANSACTIONS_TABLE_NAME}`;

interface ITransactionDbModel {
    id: number;
    date: string;
    direction: TransactionDirection;
    volume: BN;
    rate: BN;
}

enum TransactionsFields {
    ID = 'id',
    DATE = 'date',
    DIRECTION = 'direction',
    VOLUME = 'volume',
    RATE = 'rate',
}

export class TransactionsDbDao extends PostgresAbstractDao<ITransactionDbModel> {

    public static fromDbModel = (dbModel: ITransactionDbModel): ITransactionModel => ({
        id: dbModel.id,
        date: new Date(dbModel.date),
        direction: dbModel.direction,
        volume: new BN(dbModel.volume),
        rate: new BN(dbModel.rate),
    });

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
                transaction.volume.toString(),
                transaction.rate.toString(),
            ],
        }, TransactionsDbDao.fromDbModel);
    }

    public async getTransactionById(id: string): Promise<ITransactionModel> {
        try {
            return await this.find<ITransactionModel>({
                name: 'transactions_select_by_id',
                text: `SELECT * 
                        FROM ${TRANSACTIONS_FULL_TABLE_NAME} 
                        WHERE ${TransactionsFields.ID} = $1`,
                values: [id],
            }, TransactionsDbDao.fromDbModel);
        } catch (e) {
            if (e instanceof PostgresError && e.code === PostgresError.CODES.NOT_FOUND) {
                throw new PostgresError(PostgresError.CODES.NOT_FOUND, 'not found', `Transaction not found with id '${id}'`);
            }
            throw e;
        }
    }

    public async readAllTransactions(): Promise<ITransactionsReader> {
        return this.read<ITransactionModel>({
            text: `SELECT * 
                    FROM ${TRANSACTIONS_FULL_TABLE_NAME}
                    ORDER BY ${TransactionsFields.DATE};`,
        }, TransactionsDbDao.fromDbModel);
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
                ${TransactionsFields.VOLUME} double precision not null,
            
                -- Rate between
                ${TransactionsFields.RATE} double precision not null
            );`,
        });
    }
}
