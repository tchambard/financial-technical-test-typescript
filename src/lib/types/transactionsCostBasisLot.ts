import * as BN from 'bn.js';

import { IReader } from './common';

export interface ITransactionCostBasisLotModel {
    txOutId: number;
    txInId: number;
    txInVolume: BN;
    txInCost: BN;
    pnl: BN;
}

export interface ITransactionCostBasisLotPrintable {
    txOutId: number;
    txInId: number;
    txInVolume: string;
    txInCost: string;
    pnl: string;
}

export type ITransactionsCostBasisLotReader = IReader<ITransactionCostBasisLotModel>;

export const mapTransactionCostBasisLotPrintable = (transactionCostBasis: ITransactionCostBasisLotModel): ITransactionCostBasisLotPrintable => {
    return {
        txOutId: transactionCostBasis.txOutId,
        txInId: transactionCostBasis.txInId,
        txInVolume: transactionCostBasis.txInVolume.toString(),
        txInCost: transactionCostBasis.txInCost.toString(),
        pnl: transactionCostBasis.pnl.toString(),
    };
};
