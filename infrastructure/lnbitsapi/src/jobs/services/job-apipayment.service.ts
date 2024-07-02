import { existsSync, readFileSync, writeFileSync } from 'fs';
import { DBService } from '../../database/sqlite.service';
import { LnBitsTransactionDto } from '../../http/dto/lnbits-transaction.dto';
import { HttpClient } from '../../http/http-client';
import { Config } from '../../shared/config';
import { LnbitsApiLogger } from '../../shared/lnbitsapi-logger';
import { JobApipaymentWaitingTimer } from '../timer/job-apipayment.timer';

export class JobApiPaymentService {
  private readonly logger = new LnbitsApiLogger(JobApiPaymentService);

  private waitingTimer: JobApipaymentWaitingTimer;

  constructor() {
    this.waitingTimer = new JobApipaymentWaitingTimer();
  }

  async checkApiPaymentChange(): Promise<void> {
    this.logger.verbose(`checkApiPaymentChange(): waitingTimer is running? ${this.waitingTimer.isRunning()}`);
    if (this.waitingTimer.isRunning()) return;

    const maxTimeDBEntry = await this.getMaxTimeFromDB();
    const maxTimeFileEntry = this.getMaxTimeFromFile();

    this.logger.verbose(`maxTime: ${maxTimeDBEntry} : ${maxTimeFileEntry}`);

    if (maxTimeDBEntry > maxTimeFileEntry) {
      await this.doPaymentChange(maxTimeDBEntry, maxTimeFileEntry);
    }
  }

  private async doPaymentChange(maxTimeDBEntry: number, maxTimeFileEntry: number): Promise<void> {
    this.logger.verbose('doPaymentChange()');

    const apiPayments = await this.getApiPayments(maxTimeFileEntry);
    const webhookSuccess = await this.triggerTransactionWebhook(apiPayments);

    if (webhookSuccess) this.saveMaxTimeToFile(maxTimeDBEntry);
  }

  private async getMaxTimeFromDB(): Promise<number> {
    const maxTime = await DBService.selectOne<{ maxTime: number }>(
      Config.sqlite.mainDB,
      'SELECT MAX(time) AS maxTime FROM apipayments WHERE (pending = false AND amount > 0) OR amount < 0',
    ).then((r) => r?.maxTime);
    return maxTime ?? 0;
  }

  private getMaxTimeFromFile(): number {
    const filename = Config.apiPaymentJson;

    try {
      if (existsSync(filename)) {
        const maxTimeJsonEntry = JSON.parse(readFileSync(filename, 'utf8')).maxTime;
        if (maxTimeJsonEntry) return Number(maxTimeJsonEntry);
      }
    } catch (e) {
      this.logger.error(`error reading file ${filename}`, e);
    }

    return 0;
  }

  private async getApiPayments(maxTime: number): Promise<LnBitsTransactionDto[]> {
    return DBService.selectAll<LnBitsTransactionDto[]>(
      Config.sqlite.mainDB,
      `SELECT checking_id, pending, amount, fee, memo, time, bolt11, preimage, hash AS payment_hash, expiry, extra, wallet AS wallet_id, webhook, webhook_status FROM apipayments WHERE time > ${maxTime} AND ((pending = false AND amount > 0) OR amount < 0)`,
    );
  }

  private async triggerTransactionWebhook(transactions: LnBitsTransactionDto[]): Promise<boolean> {
    const result = await HttpClient.triggerTransactionsWebhook(transactions);
    this.logger.verbose(`triggerTransactionWebhook: ${result}`);

    result ? this.waitingTimer.stop() : this.waitingTimer.start();

    return result;
  }

  private saveMaxTimeToFile(maxTime: number) {
    const filename = Config.apiPaymentJson;
    this.logger.verbose(`saveMaxTimeToFile: ${filename}`);

    writeFileSync(filename, JSON.stringify({ maxTime }), 'utf-8');
  }
}
