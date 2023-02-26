import * as BN from 'bn.js';

import { PostgresAbstractDao, PostgresAccess } from '../common/postgres';
import { ITransactionCostBasisLotModel, ITransactionsCostBasisLotReader } from '../types/transactionsCostBasisLot';

export const TRANSACTIONS_COST_BASIS_LOT_SCHEMA_NAME = 'financial';
export const TRANSACTIONS_COST_BASIS_LOT_TABLE_NAME = 'transactions_cost_basis_lot';
export const TRANSACTIONS_COST_BASIS_LOT_FULL_TABLE_NAME = `${TRANSACTIONS_COST_BASIS_LOT_SCHEMA_NAME}.${TRANSACTIONS_COST_BASIS_LOT_TABLE_NAME}`;

interface ITransactionsCostBasisLotDbModel {
    tx_out_id: number;
    tx_in_id: number;
    pnl: BN;
}

enum TransactionCostBasisLotFields {
    TX_OUT_ID = 'tx_out_id',
    TX_IN_ID = 'tx_in_id',
    PNL = 'pnl',
}

export class TransactionsCostBasisLotDbDao extends PostgresAbstractDao<ITransactionsCostBasisLotDbModel> {

    public static fromDbModel = (dbModel: ITransactionsCostBasisLotDbModel): ITransactionCostBasisLotModel => ({
        txOutId: dbModel.tx_out_id,
        txInId: dbModel.tx_in_id,
        pnl: new BN(dbModel.pnl),
    });

    constructor(postgresAccess: PostgresAccess) {
        super(postgresAccess, TRANSACTIONS_COST_BASIS_LOT_SCHEMA_NAME, TRANSACTIONS_COST_BASIS_LOT_TABLE_NAME);
    }

    public async createTransactionCostsBasisLot(lot: ITransactionCostBasisLotModel): Promise<ITransactionCostBasisLotModel> {
        return this.queryFirst<ITransactionCostBasisLotModel>({
            name: 'costs_basis_lot_insert',
            text: `INSERT INTO ${TRANSACTIONS_COST_BASIS_LOT_FULL_TABLE_NAME} (${TransactionCostBasisLotFields.TX_OUT_ID}, 
                    ${TransactionCostBasisLotFields.TX_IN_ID}, ${TransactionCostBasisLotFields.PNL})
                VALUES ($1, $2, $3)
                RETURNING *;`,
            values: [
                lot.txOutId,
                lot.txInId,
                lot.pnl.toString(),
            ],
        }, TransactionsCostBasisLotDbDao.fromDbModel);
    }

    public async readAllTransactionsCostBasisLots(): Promise<ITransactionsCostBasisLotReader> {
        return this.read<ITransactionCostBasisLotModel>({
            text: `SELECT * 
                    FROM ${TRANSACTIONS_COST_BASIS_LOT_FULL_TABLE_NAME}
                    ORDER BY ${TransactionCostBasisLotFields.TX_OUT_ID}, ${TransactionCostBasisLotFields.TX_IN_ID};`,
        }, TransactionsCostBasisLotDbDao.fromDbModel);
    }

    protected async _init(): Promise<void> {
        await this.access.db.query({
            name: 'costs_basis_lot_create_table',
            text: `CREATE TABLE IF NOT EXISTS ${TRANSACTIONS_COST_BASIS_LOT_FULL_TABLE_NAME} (
                -- Transaction OUT ID
                ${TransactionCostBasisLotFields.TX_OUT_ID} integer not null,
            
                -- Transaction IN ID
                ${TransactionCostBasisLotFields.TX_IN_ID} integer not null,
            
                -- Profit an loses
                ${TransactionCostBasisLotFields.PNL} double precision not null
            );`,
        });
    }
}
