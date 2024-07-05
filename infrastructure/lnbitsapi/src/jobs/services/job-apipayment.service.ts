import { LNbitsApiPaymentCompareDto } from '../../http/dto/lnbits-compare.dto';
import { LnBitsTransactionDto } from '../../http/dto/lnbits-transaction.dto';
import { Config } from '../../shared/config';
import { Util } from '../../shared/util';
import { JobApiPaymentWaitingTimer } from '../timer/job-apipayment.timer';
import { JobService } from './job.service';

export class JobApiPaymentService extends JobService {
  private static readonly API_PAYMENT_TABLE_NAME = 'apipayments';

  private static readonly API_PAYMENT_TABLE_COLUMN_NAMES =
    'checking_id, pending, amount, fee, memo, time, bolt11, preimage, hash AS payment_hash, expiry, extra, wallet AS wallet_id, webhook, webhook_status';

  webhookUrl = Config.transactionWebhookUrl;

  dbFileName = Config.sqlite.mainDB;
  dbCompareFileName = Config.sqlite.compareApiPaymentsDB;

  jsonCompareFileName = Config.compare.apiPaymentsJson;

  dbCompareCurrentTableName = 'api_payments_current';
  dbCompareCheckTableName = 'api_payments_check';

  constructor() {
    super(new JobApiPaymentWaitingTimer());
  }

  async checkApiPaymentChange(): Promise<void> {
    return this.checkChange<LnBitsTransactionDto>(100, 1000);
  }

  async getInsertedData<LnBitsTransactionDto>(): Promise<LnBitsTransactionDto[]> {
    const selectSQL = `SELECT tbl_current.wallet_id, tbl_current.checking_id, tbl_current.hash FROM ${this.dbCompareCurrentTableName} tbl_current \
    LEFT OUTER JOIN ${this.dbCompareCheckTableName} tbl_check ON tbl_current.wallet_id = tbl_check.wallet_id AND tbl_current.checking_id = tbl_check.checking_id \
    WHERE tbl_check.hash IS NULL`;

    const comparisonResults = await this.compareDBService.getData<LNbitsApiPaymentCompareDto>(
      this.dbCompareFileName,
      selectSQL,
    );

    return this.getDataByByComparisonResults<LnBitsTransactionDto>(comparisonResults);
  }

  async getUpdatedData<LnBitsTransactionDto>(): Promise<LnBitsTransactionDto[]> {
    const selectSQL = `SELECT tbl_current.wallet_id, tbl_current.checking_id, tbl_current.hash FROM ${this.dbCompareCurrentTableName} tbl_current \
    LEFT OUTER JOIN ${this.dbCompareCheckTableName} tbl_check ON tbl_current.wallet_id = tbl_check.wallet_id AND tbl_current.checking_id = tbl_check.checking_id \
    WHERE tbl_current.hash != tbl_check.hash`;

    const comparisonResults = await this.compareDBService.getData<LNbitsApiPaymentCompareDto>(
      this.dbCompareFileName,
      selectSQL,
    );

    return this.getDataByByComparisonResults<LnBitsTransactionDto>(comparisonResults);
  }

  async getDeletedIds(): Promise<string[]> {
    return []; // Non-pending ApiPayments are never deleted
  }

  getPreparedDataSelectSQL(): string {
    return `SELECT ${JobApiPaymentService.API_PAYMENT_TABLE_COLUMN_NAMES} FROM ${JobApiPaymentService.API_PAYMENT_TABLE_NAME} WHERE wallet = ? AND checking_id = ?`;
  }

  getParamsByComparisonResults(comparisonResults: LNbitsApiPaymentCompareDto[]): string[][] {
    const selectParams: string[][] = [];

    for (const comparisonResult of comparisonResults) {
      selectParams.push([comparisonResult.wallet_id, comparisonResult.checking_id]);
    }

    return selectParams;
  }

  getPreparedLimitAndOffsetDataSelectSQL(): string {
    return `SELECT ${JobApiPaymentService.API_PAYMENT_TABLE_COLUMN_NAMES} FROM ${JobApiPaymentService.API_PAYMENT_TABLE_NAME} WHERE pending = false ORDER BY wallet, checking_id LIMIT ? OFFSET ?`;
  }

  getPreparedCompareInsertSQL(): string {
    return `INSERT INTO ${this.dbCompareCurrentTableName} (wallet_id, checking_id, hash) VALUES (?,?,?)`;
  }

  getParamsByData(transactions: LnBitsTransactionDto[]): string[][] {
    const insertParams: string[][] = [];

    for (const transaction of transactions) {
      const walletId = transaction.wallet_id;
      const checkingId = transaction.checking_id;
      const hash = Util.createHash(JSON.stringify(transaction));

      insertParams.push([walletId, checkingId, hash]);
    }

    return insertParams;
  }
}
