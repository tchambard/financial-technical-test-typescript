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

export type ITransactionsReader = IReader<ITransactionModel>;
