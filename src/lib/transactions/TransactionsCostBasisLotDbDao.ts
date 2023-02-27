/* eslint-disable max-len */
import * as BN from 'bn.js';

import { PostgresAbstractDao, PostgresAccess } from '../common/postgres';
import { ITransactionsCostBasisReader } from '../types/transactionsCostBasis';
import { ITransactionCostBasisLotModel, ITransactionsCostBasisLotReader } from '../types/transactionsCostBasisLot';

export const TRANSACTIONS_COST_BASIS_LOT_SCHEMA_NAME = 'financial';
export const TRANSACTIONS_COST_BASIS_LOT_TABLE_NAME = 'transactions_cost_basis_lot';
export const TRANSACTIONS_COST_BASIS_LOT_FULL_TABLE_NAME = `${TRANSACTIONS_COST_BASIS_LOT_SCHEMA_NAME}.${TRANSACTIONS_COST_BASIS_LOT_TABLE_NAME}`;

interface ITransactionsCostBasisLotDbModel {
    tx_out_id: number;
    tx_in_id: number;
    tx_in_volume: BN;
    tx_in_cost: BN;
    pnl: BN;
}

interface ITransactionsCostBasisAggregateDbModel {
    tx_id: number;
    volume_evo: BN;
    cost_usd_evo: BN;
    tx_pnl: BN;
}

enum F {
    tx_out_id = 'tx_out_id',
    tx_in_id = 'tx_in_id',
    tx_in_volume = 'tx_in_volume',
    tx_in_cost = 'tx_in_cost',
    pnl = 'pnl',
}

export class TransactionsCostBasisLotDbDao extends PostgresAbstractDao<ITransactionsCostBasisLotDbModel> {

    public static fromDbModel = (dbModel: ITransactionsCostBasisLotDbModel): ITransactionCostBasisLotModel => ({
        txOutId: dbModel.tx_out_id,
        txInId: dbModel.tx_in_id,
        txInVolume: new BN(dbModel.tx_in_volume),
        txInCost: new BN(dbModel.tx_in_cost),
        pnl: new BN(dbModel.pnl),
    });

    constructor(postgresAccess: PostgresAccess) {
        super(postgresAccess, TRANSACTIONS_COST_BASIS_LOT_SCHEMA_NAME, TRANSACTIONS_COST_BASIS_LOT_TABLE_NAME);
    }

    public async createTransactionCostsBasisLot(lot: ITransactionCostBasisLotModel): Promise<ITransactionCostBasisLotModel> {
        return this.queryFirst<ITransactionCostBasisLotModel>({
            name: 'create_transaction_costs_basis_lot',
            text: `INSERT INTO ${TRANSACTIONS_COST_BASIS_LOT_FULL_TABLE_NAME} (
                    ${F.tx_out_id}, ${F.tx_in_id}, ${F.tx_in_volume}, 
                    ${F.tx_in_cost}, ${F.pnl}
                )
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *;`,
            values: [
                lot.txOutId,
                lot.txInId,
                lot.txInVolume.toString(),
                lot.txInCost.toString(),
                lot.pnl.toString(),
            ],
        }, TransactionsCostBasisLotDbDao.fromDbModel);
    }

    public async readAllTransactionsCostBasisLots(): Promise<ITransactionsCostBasisLotReader> {
        return this.read<ITransactionCostBasisLotModel>({
            name: 'read_all_transactions_cost_basis_lots',
            text: `SELECT * 
                    FROM ${TRANSACTIONS_COST_BASIS_LOT_FULL_TABLE_NAME}
                    ORDER BY ${F.tx_out_id}, ${F.tx_in_id};`,
        }, TransactionsCostBasisLotDbDao.fromDbModel);
    }

    public async readComputedTransactionsCostBasisFromLots(): Promise<ITransactionsCostBasisReader> {
        const { reader, length } = await this.read<ITransactionsCostBasisAggregateDbModel, ITransactionsCostBasisAggregateDbModel>({
            name: 'read_computed_transactions_cost_basis_from_lots',
            text: `SELECT distinct COALESCE (tx_out_id, tx_in_id) as tx_id, 

                    -- compute volume evolution
                    CASE WHEN ${F.tx_out_id} isnull 
                    THEN sum(${F.tx_in_volume}) OVER (PARTITION BY COALESCE (${F.tx_out_id}, ${F.tx_in_id}) ORDER BY ${F.tx_in_id}) 
                    ELSE -sum(${F.tx_in_volume}) OVER (PARTITION BY COALESCE (${F.tx_out_id}, ${F.tx_in_id}) ORDER BY ${F.tx_out_id}) 
                    END as volume_evo,
                    
                    -- compute total cost usd evolution
                    CASE WHEN ${F.tx_out_id} isnull 
                    THEN  sum(${F.tx_in_cost}) OVER (PARTITION BY COALESCE (${F.tx_out_id}, ${F.tx_in_id}) ORDER BY ${F.tx_in_id})
                    ELSE -sum(${F.tx_in_cost}) OVER (PARTITION BY COALESCE (${F.tx_out_id}, ${F.tx_in_id}) ORDER BY ${F.tx_out_id})
                    END as cost_usd_evo,
                    
                    -- compute pnl for out transactions
                    CASE WHEN ${F.tx_out_id} isnull 
                    THEN 0 
                    ELSE sum(${F.pnl}) OVER (PARTITION BY ${F.tx_out_id} ORDER BY ${F.tx_out_id}) 
                    END as tx_pnl
                    
                    FROM ${TRANSACTIONS_COST_BASIS_LOT_FULL_TABLE_NAME} as main
                    GROUP BY GROUPING SETS (
                        (${F.tx_in_id}, ${F.tx_in_volume}, ${F.tx_in_cost}, ${F.pnl}),
                        (${F.tx_out_id}, ${F.tx_in_volume}, ${F.tx_in_cost}, ${F.pnl})
                    )
                    ORDER BY tx_id;`,
        });
        return {
            length,
            reader: reader.transform(async (_reader, writer) => {
                let totalVolume = new BN(0);
                let totalCostUsd = new BN(0);
                await reader.forEach(async (item) => {
                    totalVolume = totalVolume.add(new BN(item.volume_evo));
                    totalCostUsd = totalCostUsd.add(new BN(item.cost_usd_evo));
                    await writer.write({
                        txId: item.tx_id,
                        totalVolume,
                        totalCostUsd,
                        txPnl: new BN(item.tx_pnl),
                    });
                });
            }),
        };
    }

    protected async _init(): Promise<void> {
        await this.access.db.query({
            name: 'costs_basis_lot_create_table',
            text: `CREATE TABLE IF NOT EXISTS ${TRANSACTIONS_COST_BASIS_LOT_FULL_TABLE_NAME} (
                -- Transaction OUT ID
                ${F.tx_out_id} integer not null,
            
                -- Transaction IN ID
                ${F.tx_in_id} integer not null,
            
                -- Transaction IN share volume
                ${F.tx_in_volume} double precision not null,
                
                -- Transaction IN share cost basis
                ${F.tx_in_cost} double precision not null,
                
                -- Profit an loses
                ${F.pnl} double precision not null
            );`,
        });
    }
}
