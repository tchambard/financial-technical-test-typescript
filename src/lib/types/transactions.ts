import { IReader } from './common';

export enum TransactionDirection {
    IN = 'in',
    OUT = 'out',
}

export interface ITransactionData {
    date: Date;
    direction: TransactionDirection;
    volume: number;
    rate: number;
}
export interface ITransactionModel {
    id: number;
    date: Date;
    direction: TransactionDirection;
    volume: number;
    rate: number;
}

export type ITransactionsReader = IReader<ITransactionModel>;
