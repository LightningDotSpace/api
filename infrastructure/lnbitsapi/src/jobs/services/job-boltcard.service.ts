import { existsSync, readFileSync, writeFileSync } from 'fs';
import { Statement } from 'sqlite';
import { DBService } from '../../database/sqlite.service';
import { LNbitsBoltcardCompareDto, LnBitsBoltcardDto } from '../../http/dto/lnbits-boltcard.dto';
import { HttpClient } from '../../http/http-client';
import { Config } from '../../shared/config';
import { LnbitsApiLogger } from '../../shared/lnbitsapi-logger';
import { Util } from '../../shared/util';
import { JobBoltcardWaitingTimer } from '../timer/job-boltcard.timer';

export class JobBoltcardService {
  private readonly logger = new LnbitsApiLogger(JobBoltcardService);

  private waitingTimer: JobBoltcardWaitingTimer;

  constructor() {
    this.waitingTimer = new JobBoltcardWaitingTimer();
  }

  async checkBoltcardChange(): Promise<void> {
    this.logger.verbose(`checkBoltcardChange(): waitingTimer is running? ${this.waitingTimer.isRunning()}`);
    if (this.waitingTimer.isRunning()) return;

    const fileHashDBEntry = await this.getFileHashFromDB();
    const fileHashFileEntry = this.getFileHashFromFile();

    this.logger.verbose(`fileHash: ${fileHashDBEntry} : ${fileHashFileEntry}`);

    if (fileHashDBEntry !== fileHashFileEntry) {
      await this.doBoltcardChange(fileHashDBEntry);
    }
  }

  private async doBoltcardChange(fileHashDBEntry: string): Promise<void> {
    this.logger.verbose('doBoltcardChange()');

    await this.fillBoldcardsCompareTable();

    const changedBoltcards: LnBitsBoltcardDto[] = [];

    const insertedBoltcardIds = await this.getInsertedBoltcardIds();
    const insertedBoltcards = await this.getBoltcardsByIds(insertedBoltcardIds);
    changedBoltcards.push(...insertedBoltcards);

    const updatedBoltcardIds = await this.getUpdatedBoltcardIds();
    const updatedBoltcards = await this.getBoltcardsByIds(updatedBoltcardIds);
    changedBoltcards.push(...updatedBoltcards);

    const deletedBoltcardIds = await this.getDeletedBoltcardIds();

    const webhookSuccess = await this.triggerBoltcardsWebhook(changedBoltcards, deletedBoltcardIds);

    if (webhookSuccess) {
      await this.fillBoldcardsActualTable();
      this.saveFileHashToFile(fileHashDBEntry);
    }
  }

  private async getFileHashFromDB(): Promise<string> {
    return Util.createFileHash(Config.sqlite.boltcardsDB);
  }

  private getFileHashFromFile(): string {
    const filename = Config.boltcardJson;

    try {
      if (existsSync(filename)) {
        const fileHashJsonEntry = JSON.parse(readFileSync(filename, 'utf8')).fileHash;
        if (fileHashJsonEntry) return String(fileHashJsonEntry);
      }
    } catch (e) {
      this.logger.error(`error reading file ${filename}`, e);
    }

    return '';
  }

  private saveFileHashToFile(fileHash: string) {
    const filename = Config.boltcardJson;
    this.logger.verbose(`saveFileHashToFile: ${filename}`);

    writeFileSync(filename, JSON.stringify({ fileHash }), 'utf-8');
  }

  private async fillBoldcardsCompareTable(): Promise<void> {
    await this.doCleanBoltcardsCompareTable();

    const boltcardsCompareDB = await DBService.openRW(Config.sqlite.boltcardsCompareDB);
    const insertSQL = 'INSERT INTO boltcard_cards_compare (id, hash) VALUES (?,?)';
    const insertStatement = await DBService.createStatement(boltcardsCompareDB, insertSQL);

    const boltcardsDB = await DBService.openRW(Config.sqlite.boltcardsDB);
    const selectSQL =
      'SELECT id, wallet, card_name, uid, external_id, counter, tx_limit, daily_limit, enable, k0, k1, k2, prev_k0, prev_k1, prev_k2, otp, time FROM cards ORDER BY time,id LIMIT ? OFFSET ?';
    const selectStatement = await DBService.createStatement(boltcardsDB, selectSQL);

    const loopLimit = 100;
    const sqlLimit = 1000;
    let sqlOffset = 0;

    for (let loopCounter = 0; loopCounter < loopLimit; loopCounter++) {
      const boltcards = await selectStatement.all<LnBitsBoltcardDto[]>([sqlLimit, sqlOffset]);
      if (!boltcards.length) break;

      await this.doFillBoltcardsCompareTable(insertStatement, boltcards);

      sqlOffset += sqlLimit;
    }

    await insertStatement.finalize();
    await selectStatement.finalize();

    await DBService.close(boltcardsCompareDB);
    await DBService.close(boltcardsDB);
  }

  private async doCleanBoltcardsCompareTable(): Promise<void> {
    const deleteSQL = 'DELETE FROM boltcard_cards_compare';
    await DBService.execute(Config.sqlite.boltcardsCompareDB, deleteSQL);
  }

  private async doFillBoltcardsCompareTable(insertStatement: Statement, boltcards: LnBitsBoltcardDto[]): Promise<void> {
    for (const boltcard of boltcards) {
      const boltcardId = boltcard.id;
      const hash = Util.createHash(JSON.stringify(boltcard));

      await insertStatement.run([boltcardId, hash]);
    }
  }

  private async fillBoldcardsActualTable(): Promise<void> {
    await this.doCleanBoltcardsActualTable();
    await this.doFillBoltcardsActualTable();
  }

  private async doCleanBoltcardsActualTable(): Promise<void> {
    const deleteSQL = 'DELETE FROM boltcard_cards_actual';
    await DBService.execute(Config.sqlite.boltcardsCompareDB, deleteSQL);
  }

  private async doFillBoltcardsActualTable(): Promise<void> {
    const insertSQL = 'INSERT INTO boltcard_cards_actual SELECT * FROM boltcard_cards_compare';
    await DBService.execute(Config.sqlite.boltcardsCompareDB, insertSQL);
  }

  async getInsertedBoltcardIds(): Promise<string[]> {
    const selectSQL =
      'SELECT compare.id, compare.hash FROM boltcard_cards_compare compare LEFT OUTER JOIN boltcard_cards_actual actual ON compare.id = actual.id WHERE actual.hash IS NULL';
    return DBService.selectAll<LNbitsBoltcardCompareDto[]>(Config.sqlite.boltcardsCompareDB, selectSQL).then((r) =>
      r.map((b) => b.id),
    );
  }

  async getUpdatedBoltcardIds(): Promise<string[]> {
    const selectSQL =
      'SELECT compare.id, compare.hash FROM boltcard_cards_compare compare LEFT OUTER JOIN boltcard_cards_actual actual ON compare.id = actual.id WHERE compare.hash != actual.hash';
    return DBService.selectAll<LNbitsBoltcardCompareDto[]>(Config.sqlite.boltcardsCompareDB, selectSQL).then((r) =>
      r.map((b) => b.id),
    );
  }

  async getDeletedBoltcardIds(): Promise<string[]> {
    const selectSQL =
      'SELECT actual.id, actual.hash FROM boltcard_cards_actual actual LEFT OUTER JOIN boltcard_cards_compare compare ON actual.id = compare.id WHERE compare.hash IS NULL';
    return DBService.selectAll<LNbitsBoltcardCompareDto[]>(Config.sqlite.boltcardsCompareDB, selectSQL).then((r) =>
      r.map((b) => b.id),
    );
  }

  async getBoltcardsByIds(boltcardIds: string[]): Promise<LnBitsBoltcardDto[]> {
    if (!boltcardIds.length) return [];

    const boltcardIdsInSQL = boltcardIds.map((i) => `'${i}'`).join(',');
    const selectSQL = `SELECT id, wallet, card_name, uid, external_id, counter, tx_limit, daily_limit, enable, k0, k1, k2, prev_k0, prev_k1, prev_k2, otp, time FROM cards WHERE id IN (${boltcardIdsInSQL})`;

    return DBService.selectAll<LnBitsBoltcardDto[]>(Config.sqlite.boltcardsDB, selectSQL);
  }

  private async triggerBoltcardsWebhook(
    changedBoltcards: LnBitsBoltcardDto[],
    deletedBoltcardIds: string[],
  ): Promise<boolean> {
    const result = await HttpClient.triggerBoltcardsWebhook(changedBoltcards, deletedBoltcardIds);
    this.logger.verbose(`triggerBoltcardsWebhook: ${result}`);

    result ? this.waitingTimer.stop() : this.waitingTimer.start();

    return result;
  }
}
