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

export interface ITransactionCostBasisPrintable {
    txId: number;
    totalVolume: string;
    totalCostUsd: string;
    txPnl?: string;
}

export type ITransactionsCostBasisReader = IReader<ITransactionCostBasisModel>;

export const mapTransactionCostBasisPrintable = (transactionCostBasis: ITransactionCostBasisModel): ITransactionCostBasisPrintable =>  {
    return {
        txId: transactionCostBasis.txId,
        totalVolume: transactionCostBasis.totalVolume.toString(),
        totalCostUsd: transactionCostBasis.totalCostUsd.toString(),
        txPnl: transactionCostBasis.txPnl?.toString(),
    };
};

export interface ITransactionCostBasisWithEvo {
    txId: number;
    volumeEvo: BN;
    costUsdEvo: BN;
    txPnl?: BN;
}
