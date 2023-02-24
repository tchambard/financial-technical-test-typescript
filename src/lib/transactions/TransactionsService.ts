import { IReader } from '../types/common';
import { ITransactionData, ITransactionModel } from '../types/transactions';
import { TransactionsDbDao } from './TransactionsDbDao';

export class TransactionsService {
    private symbolsDbDao: TransactionsDbDao;

    constructor(symbolsDbDao: TransactionsDbDao) {
        this.symbolsDbDao = symbolsDbDao;
    }

    public async createTransaction(symbolData: ITransactionData): Promise<ITransactionModel> {
        return this.symbolsDbDao.createTransaction(symbolData);
    }

    public async getTransactionById(symbolId: string): Promise<ITransactionModel> {
        return this.symbolsDbDao.getTransactionById(symbolId);
    }

    public async readAllTransactions(): Promise<IReader<ITransactionModel>> {
        return this.symbolsDbDao.readAllTransactions();
    }

}
