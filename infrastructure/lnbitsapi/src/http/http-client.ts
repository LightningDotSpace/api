import { AxiosRequestConfig } from 'axios';
import { Agent } from 'https';
import { Config } from '../shared/config';
import { LnbitsApiLogger } from '../shared/lnbitsapi-logger';
import { Util } from '../shared/util';
import { HttpService } from './http.service';

class HttpSender {
  private readonly logger = new LnbitsApiLogger(HttpSender);

  private http: HttpService;

  constructor() {
    this.http = new HttpService();
  }

  async triggerWebhook<T>(webhookUrl: string, changed: T[], deletedIds: string[]): Promise<boolean> {
    this.logger.verbose(`triggerWebhook(): ${webhookUrl}`);
    this.logger.verbose(`Number of changed data: ${changed.length}`);
    this.logger.verbose(`Number of deleted data: ${deletedIds.length}`);

    const data = {
      changed: changed,
      deleted: deletedIds,
    };

    this.logger.verbose('-'.repeat(80));
    this.logger.verbose(JSON.stringify(data));
    this.logger.verbose('-'.repeat(80));

    return this.http
      .post<any>(webhookUrl, data, this.httpConfig(JSON.stringify(data)))
      .then(() => true)
      .catch((e) => {
        this.logger.error(`triggerWebhook: ${webhookUrl}`, e);
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
