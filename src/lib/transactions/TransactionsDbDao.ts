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

enum F {
    id = 'id',
    date = 'date',
    direction = 'direction',
    volume = 'volume',
    rate = 'rate',
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
            text: `INSERT INTO ${TRANSACTIONS_FULL_TABLE_NAME} (${F.date}, 
                    ${F.direction}, ${F.volume}, ${F.rate})
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
                name: 'get_transaction_by_id',
                text: `SELECT * 
                        FROM ${TRANSACTIONS_FULL_TABLE_NAME} 
                        WHERE ${F.id} = $1`,
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
            name: 'read_all_transactions',
            text: `SELECT * 
                    FROM ${TRANSACTIONS_FULL_TABLE_NAME}
                    ORDER BY ${F.date};`,
        }, TransactionsDbDao.fromDbModel);
    }

    protected async _init(): Promise<void> {
        await this.access.db.query({
            name: 'transactions_create_table',
            text: `CREATE TABLE IF NOT EXISTS ${TRANSACTIONS_FULL_TABLE_NAME} (
                -- Unique identifier for the transaction
                ${F.id} serial not null primary key,
            
                -- Date at which the transaction happened
                ${F.date} text not null,
            
                -- Whether money is being received, or spent
                ${F.direction} text check ( direction in ('in', 'out') ) not null,
            
                -- Amount of crypto transferred
                ${F.volume} double precision not null,
            
                -- Rate between
                ${F.rate} double precision not null
            );`,
        });
    }
}
