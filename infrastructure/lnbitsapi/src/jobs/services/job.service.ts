import { DBService } from '../../database/sqlite.service';
import { DBTransaction } from '../../database/sqlite.transaction';
import { LnBitsCompareDto } from '../../http/dto/lnbits-compare.dto';
import { HttpClient } from '../../http/http-client';
import { LnbitsApiLogger } from '../../shared/lnbitsapi-logger';
import { WaitingTimer } from '../../timer/waiting-timer';
import { CompareDBService } from './compare-db.service';
import { CompareFileService } from './compare-file.service';

export abstract class JobService {
  readonly logger = new LnbitsApiLogger(JobService);

  waitingTimer: WaitingTimer;
  compareFileService: CompareFileService;
  compareDBService: CompareDBService;

  constructor(waitingTimer: WaitingTimer) {
    this.waitingTimer = waitingTimer;

    this.compareFileService = new CompareFileService();
    this.compareDBService = new CompareDBService();
  }

  abstract webhookUrl: string;

  abstract dbFileName: string;
  abstract dbCompareFileName: string;

  abstract jsonCompareFileName: string;

  abstract dbCompareCurrentTableName: string;
  abstract dbCompareCheckTableName: string;

  async checkChange<T>(loopLimit: number, sqlLimit: number): Promise<void> {
    if (this.waitingTimer.isRunning()) return;

    const startTime = Date.now();

    try {
      const fileHashDBEntry = await this.compareFileService.getFileHashFromDB(this.dbFileName);
      const fileHashFileEntry = this.compareFileService.getFileHashFromFile(this.jsonCompareFileName);

      if (fileHashDBEntry !== fileHashFileEntry) {
        await this.doChange<T>(fileHashDBEntry, loopLimit, sqlLimit);
      }
    } catch (e) {
      this.logger.error(`Error while executing change job of ${this.constructor.name}`, e);
    }

    this.logger.verbose(`${this.constructor.name} runtime in ms: ${Date.now() - startTime}`);
  }

  private async doChange<T>(fileHashDBEntry: string, loopLimit: number, sqlLimit: number): Promise<void> {
    this.logger.verbose(`${this.constructor.name}::doChange()`);

    await this.fillCompareTable(loopLimit, sqlLimit);

    const changedData: T[] = [];

    const insertedData = await this.getInsertedData<T>();
    changedData.push(...insertedData);

    const updatedData = await this.getUpdatedData<T>();
    changedData.push(...updatedData);

    const deletedIds = await this.getDeletedIds();

    const webhookSuccess = await this.triggerWebhook<T>(changedData, deletedIds);

    if (webhookSuccess) {
      await this.compareDBService.syncTable(
        this.dbCompareFileName,
        this.dbCompareCurrentTableName,
        this.dbCompareCheckTableName,
      );
      this.compareFileService.saveFileHashToFile(this.jsonCompareFileName, fileHashDBEntry);
    }
  }

  abstract getInsertedData<T>(): Promise<T[]>;
  abstract getUpdatedData<T>(): Promise<T[]>;
  abstract getDeletedIds(): Promise<string[]>;

  private async fillCompareTable<T>(loopLimit: number, sqlLimit: number): Promise<void> {
    const contentDB = await DBService.openRO(this.dbFileName);
    const selectSQL = this.getPreparedLimitAndOffsetDataSelectSQL();
    const selectStatement = await contentDB.prepare(selectSQL);

    const compareDB = await DBService.openRW(this.dbCompareFileName);
    const deleteSQL = `DELETE FROM ${this.dbCompareCurrentTableName}`;
    const insertSQL = this.getPreparedCompareInsertSQL();
    const insertStatement = await compareDB.prepare(insertSQL);

    try {
      let sqlOffset = 0;

      await DBTransaction.start(compareDB);
      await compareDB.exec(deleteSQL);

      for (let loopCounter = 0; loopCounter < loopLimit; loopCounter++) {
        const data = await selectStatement.all<T[]>([sqlLimit, sqlOffset]);
        if (!data.length) break;

        const insertParams = this.getParamsByData(data);

        for (const insertParam of insertParams) {
          await insertStatement.run(insertParam);
        }

        sqlOffset += sqlLimit;
      }

      await DBTransaction.commit(compareDB);
    } catch (e) {
      this.logger.error(`${this.constructor.name}: Error while filling compare table`, e);
      await DBTransaction.rollback(compareDB);
    } finally {
      await insertStatement.finalize();
      await selectStatement.finalize();

      await DBService.close(compareDB);
      await DBService.close(contentDB);
    }
  }

  abstract getPreparedCompareInsertSQL(): string;
  abstract getPreparedLimitAndOffsetDataSelectSQL(): string;
  abstract getParamsByData(data: any): string[][];

  private async triggerWebhook<T>(changedData: T[], deletedIds: string[]): Promise<boolean> {
    const result = await HttpClient.triggerWebhook<T>(this.webhookUrl, changedData, deletedIds);
    this.logger.verbose(`${this.constructor.name} triggerWebhook: ${result}`);

    result ? this.waitingTimer.stop() : this.waitingTimer.start();

    return result;
  }

  async getDataByByComparisonResults<T>(comparisonResults: LnBitsCompareDto[]): Promise<T[]> {
    const result: T[] = [];
    if (!comparisonResults.length) return result;

    const contentDB = await DBService.openRO(this.dbFileName);
    const selectSQL = this.getPreparedDataSelectSQL();
    const selectStatement = await contentDB.prepare(selectSQL);

    try {
      const comparisonParams = this.getParamsByComparisonResults(comparisonResults);

      for (const comparisonParam of comparisonParams) {
        const data = await selectStatement.get<T>(comparisonParam);
        if (data) result.push(data);
      }

      return result;
    } catch (e) {
      this.logger.error(`${this.constructor.name}: Error while selecting data, result maybe incomplete`, e);
      return result;
    } finally {
      await selectStatement.finalize();

      await DBService.close(contentDB);
    }
  }

  abstract getPreparedDataSelectSQL(): string;
  abstract getParamsByComparisonResults(comparisonResults: LnBitsCompareDto[]): string[][];
}
