import { existsSync, readFileSync, writeFileSync } from 'fs';
import { LnBitsTransactionDto } from 'src/http/dto/lnbits-transaction.dto';
import { DBService } from '../../database/sqlite.service';
import { HttpClient } from '../../http/http-client';
import { Config } from '../../shared/config';
import { LnbitsApiLogger } from '../../shared/lnbitsapi-logger';
import { WaitingTimer } from '../../timer/waiting-timer';

export class JobApiPaymentService {
  private readonly logger = new LnbitsApiLogger(JobApiPaymentService);

  private waitingTimer: WaitingTimer;

  constructor() {
    this.waitingTimer = new WaitingTimer();
  }

  async checkApiPaymentChange(): Promise<void> {
    this.logger.info('checkApiPaymentChange()');
    if (this.waitingTimer.isRunning()) return;

    const maxTimeDBEntry = await this.getMaxTimeFromDB();
    const maxTimeFileEntry = this.getMaxTimeFromFile();

    this.logger.info(`${maxTimeDBEntry} : ${maxTimeFileEntry}`);

    if (maxTimeDBEntry > maxTimeFileEntry) {
      await this.doPaymentChange(maxTimeDBEntry, maxTimeFileEntry);
    }
  }

  private async doPaymentChange(maxTimeDBEntry: number, maxTimeFileEntry: number): Promise<void> {
    const apiPayments = await this.getApiPayments(maxTimeFileEntry);
    const webhookSuccess = await this.triggerWebhook(apiPayments);

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
    this.logger.info(`getMaxTimeFromFile: ${filename}`);

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

  private async triggerWebhook(transactions: LnBitsTransactionDto[]): Promise<boolean> {
    const result = await HttpClient.triggerWebhook(transactions);
    this.logger.info(`triggerWebhook: ${result}`);

    if (result) {
      this.waitingTimer.stop();
    } else {
      this.waitingTimer.start();
    }

    return result;
  }

  private saveMaxTimeToFile(maxTime: number) {
    const filename = Config.apiPaymentJson;
    this.logger.info(`saveMaxTimeToFile: ${filename}`);

    writeFileSync(filename, JSON.stringify({ maxTime }), 'utf-8');
  }
}