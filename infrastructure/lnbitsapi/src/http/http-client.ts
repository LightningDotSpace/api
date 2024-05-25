import { AxiosRequestConfig } from 'axios';
import { Agent } from 'https';
import { Config } from '../shared/config';
import { Util } from '../shared/util';
import { LnBitsTransactionDto } from './dto/lnbits-transaction.dto';
import { HttpService } from './http.service';

class HttpSender {
  private http: HttpService;

  constructor() {
    this.http = new HttpService();
  }

  async triggerWebhook(transactions: LnBitsTransactionDto[]): Promise<boolean> {
    return this.http
      .post<any>(Config.webhookUrl, transactions, this.httpConfig(JSON.stringify(transactions)))
      .then(() => true)
      .catch(() => false);
  }

  private httpConfig(data: string): AxiosRequestConfig {
    return {
      httpsAgent: new Agent({}),
      headers: { 'LDS-LnbitsApi-Signature': Util.createSignature(data, Config.httpSignature.privKey) },
    };
  }
}

export const HttpClient: HttpSender = new HttpSender();
