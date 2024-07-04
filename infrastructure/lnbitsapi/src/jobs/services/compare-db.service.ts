import { DBService } from '../../database/sqlite.service';
import { DBTransaction } from '../../database/sqlite.transaction';
import { LnbitsApiLogger } from '../../shared/lnbitsapi-logger';

export class CompareDBService {
  private readonly logger = new LnbitsApiLogger(CompareDBService);

  async syncTable(dbFileName: string, fromTableName: string, toTableName: string): Promise<void> {
    const compareDB = await DBService.openRW(dbFileName);

    try {
      await DBTransaction.start(compareDB);

      const deleteSQL = `DELETE FROM ${toTableName}`;
      await compareDB.exec(deleteSQL);

      const insertSQL = `INSERT INTO ${toTableName} SELECT * FROM ${fromTableName}`;
      await compareDB.exec(insertSQL);

      await DBTransaction.commit(compareDB);
    } catch (e) {
      this.logger.error('Error while syncing the compare tables', e);
      await DBTransaction.rollback(compareDB);
    } finally {
      await DBService.close(compareDB);
    }
  }

  async getData<T>(dbFileName: string, selectSQL: string): Promise<T[]> {
    return DBService.selectAll<T[]>(dbFileName, selectSQL);
  }
}
