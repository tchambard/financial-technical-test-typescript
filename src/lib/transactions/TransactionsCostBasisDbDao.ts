import * as BN from 'bn.js';

import { PostgresAbstractDao, PostgresAccess } from '../common/postgres';
import { ITransactionCostBasisModel, ITransactionsCostBasisReader } from '../types/transactionsCostBasis';

export const TRANSACTIONS_COST_BASIS_SCHEMA_NAME = 'financial';
export const TRANSACTIONS_COST_BASIS_TABLE_NAME = 'transactions_cost_basis';
export const TRANSACTIONS_COST_BASIS_FULL_TABLE_NAME = `${TRANSACTIONS_COST_BASIS_SCHEMA_NAME}.${TRANSACTIONS_COST_BASIS_TABLE_NAME}`;

interface ITransactionsCostBasisDbModel {
    tx_id: number;
    total_volume: BN;
    total_cost_usd: BN;
    tx_pnl: BN;
}

enum TransactionCostBasisFields {
    TX_ID = 'tx_id',
    TOTAL_VOLUME = 'total_volume',
    TOTAL_COST = 'total_cost_usd',
    TX_PNL = 'tx_pnl',
}

export class TransactionsCostBasisDbDao extends PostgresAbstractDao<ITransactionsCostBasisDbModel> {

    public static fromDbModel = (dbModel: ITransactionsCostBasisDbModel): ITransactionCostBasisModel => ({
        txId: dbModel.tx_id,
        totalVolume: new BN(dbModel.total_volume),
        totalCostUsd: new BN(dbModel.total_cost_usd),
        txPnl: new BN(dbModel.tx_pnl),
    });

    constructor(postgresAccess: PostgresAccess) {
        super(postgresAccess, TRANSACTIONS_COST_BASIS_SCHEMA_NAME, TRANSACTIONS_COST_BASIS_TABLE_NAME);
    }

    public async createTransactionCostsBasis(costBasis: ITransactionCostBasisModel): Promise<ITransactionCostBasisModel> {
        return this.queryFirst<ITransactionCostBasisModel>({
            name: 'costs_basis_insert',
            text: `INSERT INTO ${TRANSACTIONS_COST_BASIS_FULL_TABLE_NAME} (${TransactionCostBasisFields.TX_ID}, 
                    ${TransactionCostBasisFields.TOTAL_VOLUME}, ${TransactionCostBasisFields.TOTAL_COST}, ${TransactionCostBasisFields.TX_PNL})
                VALUES ($1, $2, $3, $4)
                RETURNING *;`,
            values: [
                costBasis.txId,
                costBasis.totalVolume.toString(),
                costBasis.totalCostUsd.toString(),
                costBasis.txPnl?.toString() ?? 0,
            ],
        }, TransactionsCostBasisDbDao.fromDbModel);
    }

    public async readAllTransactionsCostBasis(): Promise<ITransactionsCostBasisReader> {
        return this.read<ITransactionCostBasisModel>({
            text: `SELECT * 
                    FROM ${TRANSACTIONS_COST_BASIS_FULL_TABLE_NAME}
                    ORDER BY ${TransactionCostBasisFields.TX_ID};`,
        }, TransactionsCostBasisDbDao.fromDbModel);
    }

    protected async _init(): Promise<void> {
        await this.access.db.query({
            name: 'costs_basis_create_table',
            text: `CREATE TABLE IF NOT EXISTS ${TRANSACTIONS_COST_BASIS_FULL_TABLE_NAME} (
                -- Unique identifier referencing a transaction
                ${TransactionCostBasisFields.TX_ID} integer not null primary key,
            
                -- Total shares hold after transaction
                ${TransactionCostBasisFields.TOTAL_VOLUME} double precision not null,
            
                -- Total cost corresponding 
                ${TransactionCostBasisFields.TOTAL_COST} double precision not null,
                
                -- Transaction profits and loses (only for tx out)
                ${TransactionCostBasisFields.TX_PNL} double precision
            );`,
        });
    }
}
