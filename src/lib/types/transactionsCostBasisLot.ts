import * as BN from 'bn.js';

import { IReader } from './common';

export interface ITransactionCostBasisLotModel {
    txOutId: number;
    txInId: number;
    pnl: BN;
}

export type ITransactionsCostBasisLotReader = IReader<ITransactionCostBasisLotModel>;
