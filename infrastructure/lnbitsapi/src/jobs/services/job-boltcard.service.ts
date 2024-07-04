import { LnBitsBoltcardDto } from '../../http/dto/lnbits-boltcard.dto';
import { LNbitsBoltcardCompareDto } from '../../http/dto/lnbits-compare.dto';
import { Config } from '../../shared/config';
import { Util } from '../../shared/util';
import { JobBoltcardWaitingTimer } from '../timer/job-boltcard.timer';
import { JobService } from './job.service';

export class JobBoltcardService extends JobService {
  private static readonly CARDS_TABLE_NAME = 'cards';

  private static readonly CARDS_TABLE_COLUMN_NAMES =
    'id, wallet, card_name, uid, external_id, counter, tx_limit, daily_limit, enable, k0, k1, k2, prev_k0, prev_k1, prev_k2, otp, time';

  webhookUrl = Config.boltcardWebhookUrl;

  dbFileName = Config.sqlite.boltcardsDB;
  dbCompareFileName = Config.sqlite.compareBoltcardsDB;

  jsonCompareFileName = Config.compare.boltcardsJson;

  dbCompareCurrentTableName = 'boltcard_cards_current';
  dbCompareCheckTableName = 'boltcard_cards_check';

  constructor() {
    super(new JobBoltcardWaitingTimer());
  }

  async checkBoltcardChange(): Promise<void> {
    return this.checkChange<LnBitsBoltcardDto>(100, 1000);
  }

  async getInsertedData<LnBitsBoltcardDto>(): Promise<LnBitsBoltcardDto[]> {
    const selectSQL = `SELECT tbl_current.id, tbl_current.hash FROM ${this.dbCompareCurrentTableName} tbl_current \
    LEFT OUTER JOIN ${this.dbCompareCheckTableName} tbl_check ON tbl_current.id = tbl_check.id \
    WHERE tbl_check.hash IS NULL`;

    const comparisonResults = await this.compareDBService.getData<LNbitsBoltcardCompareDto>(
      this.dbCompareFileName,
      selectSQL,
    );

    return this.getDataByByComparisonResults<LnBitsBoltcardDto>(comparisonResults);
  }

  async getUpdatedData<LnBitsBoltcardDto>(): Promise<LnBitsBoltcardDto[]> {
    const selectSQL = `SELECT tbl_current.id, tbl_current.hash FROM ${this.dbCompareCurrentTableName} tbl_current \
    LEFT OUTER JOIN ${this.dbCompareCheckTableName} tbl_check ON tbl_current.id = tbl_check.id \
    WHERE tbl_current.hash != tbl_check.hash`;

    const comparisonResults = await this.compareDBService.getData<LNbitsBoltcardCompareDto>(
      this.dbCompareFileName,
      selectSQL,
    );

    return this.getDataByByComparisonResults<LnBitsBoltcardDto>(comparisonResults);
  }

  async getDeletedIds(): Promise<string[]> {
    const selectSQL = `SELECT tbl_check.id, tbl_check.hash FROM ${this.dbCompareCheckTableName} tbl_check \
    LEFT OUTER JOIN ${this.dbCompareCurrentTableName} tbl_current ON tbl_check.id = tbl_current.id \
    WHERE tbl_current.hash IS NULL`;

    const comparisonResults = await this.compareDBService.getData<LNbitsBoltcardCompareDto>(
      this.dbCompareFileName,
      selectSQL,
    );

    return comparisonResults.map((r) => r.id);
  }

  getPreparedDataSelectSQL(): string {
    return `SELECT ${JobBoltcardService.CARDS_TABLE_COLUMN_NAMES} FROM ${JobBoltcardService.CARDS_TABLE_NAME} WHERE id = ?`;
  }

  getParamsByComparisonResults(comparisonResults: LNbitsBoltcardCompareDto[]): string[][] {
    const selectParams: string[][] = [];

    for (const comparisonResult of comparisonResults) {
      selectParams.push([comparisonResult.id]);
    }

    return selectParams;
  }

  getPreparedLimitAndOffsetDataSelectSQL(): string {
    return `SELECT ${JobBoltcardService.CARDS_TABLE_COLUMN_NAMES} FROM ${JobBoltcardService.CARDS_TABLE_NAME} ORDER BY id LIMIT ? OFFSET ?`;
  }

  getPreparedCompareInsertSQL(): string {
    return `INSERT INTO ${this.dbCompareCurrentTableName} (id, hash) VALUES (?,?)`;
  }

  getParamsByData(boltcards: LnBitsBoltcardDto[]): string[][] {
    const insertParams: string[][] = [];

    for (const boltcard of boltcards) {
      const id = boltcard.id;
      const hash = Util.createHash(JSON.stringify(boltcard));

      insertParams.push([id, hash]);
    }

    return insertParams;
  }
}
