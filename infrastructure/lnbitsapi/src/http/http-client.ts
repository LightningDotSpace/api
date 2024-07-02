import { AxiosRequestConfig } from 'axios';
import { Agent } from 'https';
import { Config } from '../shared/config';
import { LnbitsApiLogger } from '../shared/lnbitsapi-logger';
import { Util } from '../shared/util';
import { LnBitsBoltcardDto } from './dto/lnbits-boltcard.dto';
import { LnBitsTransactionDto } from './dto/lnbits-transaction.dto';
import { HttpService } from './http.service';

class HttpSender {
  private readonly logger = new LnbitsApiLogger(HttpSender);

  private http: HttpService;

  constructor() {
    this.http = new HttpService();
  }

  async triggerTransactionsWebhook(transactions: LnBitsTransactionDto[]): Promise<boolean> {
    const webhookUrl = Config.transactionWebhookUrl;
    this.logger.verbose(`triggerTransactionsWebhook: ${webhookUrl}`);

    return this.http
      .post<any>(webhookUrl, transactions, this.httpConfig(JSON.stringify(transactions)))
      .then(() => true)
      .catch((e) => {
        this.logger.error(`triggerTransactionsWebhook: ${webhookUrl}`, e);
        return false;
      });
  }

  async triggerBoltcardsWebhook(changedBoltcards: LnBitsBoltcardDto[], deletedBoltcardIds: string[]): Promise<boolean> {
    const webhookUrl = Config.boltcardWebhookUrl;
    this.logger.verbose(`triggerBoltcardsWebhook: ${webhookUrl}`);

    const data = {
      changed: changedBoltcards,
      deleted: deletedBoltcardIds,
    };

    return this.http
      .post<any>(webhookUrl, data, this.httpConfig(JSON.stringify(data)))
      .then(() => true)
      .catch((e) => {
        this.logger.error(`triggerBoltcardsWebhook: ${webhookUrl}`, e);
        return false;
      });
  }

  private httpConfig(data: string): AxiosRequestConfig {
    return {
      httpsAgent: new Agent({}),
      headers: { 'LDS-LnbitsApi-Signature': Util.createSignature(data, Config.httpSignature.privKey) },
    };
  }
}

export const HttpClient: HttpSender = new HttpSender();
