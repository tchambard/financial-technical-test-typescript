import * as BN from 'bn.js';

import { IReader } from './common';

export enum TransactionDirection {
    IN = 'in',
    OUT = 'out',
}

export interface ITransactionData {
    date: Date;
    direction: TransactionDirection;
    volume: BN;
    rate: BN;
}

export interface ITransactionModel {
    id: number;
    date: Date;
    direction: TransactionDirection;
    volume: BN;
    rate: BN;
}

export interface ITransactionPrintable {
    id: number;
    date: string;
    direction: TransactionDirection;
    volume: string;
    rate: string;
}

export type ITransactionsReader = IReader<ITransactionModel>;

export const mapTransactionPrintable = (transaction: ITransactionModel): ITransactionPrintable =>  {
    return {
        id: transaction.id,
        date: transaction.date.toISOString(),
        direction: transaction.direction,
        volume: transaction.volume?.toString(),
        rate: transaction.rate?.toString(),
    };
};
