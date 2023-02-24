import { ITransactionModel, TransactionDirection } from '../types/transactions';

export const TRANSACTIONS_SCHEMA_NAME = 'financial';
export const TRANSACTIONS_TABLE_NAME = 'transactions';
export const TRANSACTIONS_FULL_TABLE_NAME = `${TRANSACTIONS_SCHEMA_NAME}.${TRANSACTIONS_TABLE_NAME}`;

export interface ITransactionDbModel {
    id: number;
    date: string;
    direction: TransactionDirection;
    volume: number;
    rate: number;
}

export enum TransactionsFields {
    ID = 'id',
    DATE = 'date',
    DIRECTION = 'direction',
    VOLUME = 'volume',
    RATE = 'rate',
}

export class TransactionsDbMapper {
    public static fromDbModel = (dbModel: ITransactionDbModel): ITransactionModel => ({
        id: dbModel.id,
        date: new Date(dbModel.date),
        direction: dbModel.direction,
        volume: dbModel.volume,
        rate: dbModel.rate,
    });
}
