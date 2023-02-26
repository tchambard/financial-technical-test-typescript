import * as BN from 'bn.js';

import { IReader } from './common';

export interface ITransactionCostBasisData {
    totalVolume: BN;
    totalCostUsd: BN;
    txPnl?: BN;
}

export interface ITransactionCostBasisModel extends ITransactionCostBasisData {
    txId: number;
}

export type ITransactionsCostBasisReader = IReader<ITransactionCostBasisModel>;
