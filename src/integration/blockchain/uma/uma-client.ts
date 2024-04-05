import { InMemoryPublicKeyCache, LnurlpResponse, PayReqResponse, PayRequest, PubKeyResponse } from '@uma-sdk/core';
import { Config } from 'src/config/config';
import { HttpService } from 'src/shared/services/http.service';
import { LightningLogger } from 'src/shared/services/lightning-logger';

export class UmaClient {
  private readonly logger = new LightningLogger(UmaClient);

  private publicKeyCache: InMemoryPublicKeyCache;

  constructor(private readonly http: HttpService) {
    this.publicKeyCache = new InMemoryPublicKeyCache();
  }

  async sendRequest(url: string): Promise<LnurlpResponse> {
    return this.http.get<LnurlpResponse>(url);
  }

  async sendPayRequest(url: string, payRequest: PayRequest): Promise<PayReqResponse> {
    return this.http.post<PayReqResponse>(url, payRequest);
  }

  async getPublicKey(vaspDomain: string): Promise<PubKeyResponse> {
    const publicKey = this.publicKeyCache.fetchPublicKeyForVasp(vaspDomain);
    if (publicKey) return publicKey;

    const protocol = new URL(Config.url).protocol;
    const url = `${protocol}//${vaspDomain}/.well-known/lnurlpubkey`;
    const response = await this.http.get<PubKeyResponse>(url);

    this.publicKeyCache.addPublicKeyForVasp(vaspDomain, response);
    return response;
  }
}
