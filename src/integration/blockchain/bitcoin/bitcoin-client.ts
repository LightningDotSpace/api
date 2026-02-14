import { Config } from 'src/config/config';
import { HttpRequestConfig, HttpService } from 'src/shared/services/http.service';
import { LightningHelper } from '../lightning/lightning-helper';

export interface UnspentUtxo {
  txid: string;
  vout: number;
  address: string;
  amount: number;
  confirmations: number;
}

export class BitcoinClient {
  constructor(private readonly http: HttpService) {}

  async getWalletBalance(): Promise<number> {
    const url = Config.blockchain.bitcoin.gatewayUrl;

    const balanceResult = await this.http
      .post<{ result: number }>(
        url,
        {
          id: 1,
          jsonrpc: '2.0',
          method: 'getbalance',
          params: [],
        },
        this.httpConfig(),
      )
      .then((r) => r.result);

    return LightningHelper.btcToSat(balanceResult);
  }

  async listUnspent(): Promise<UnspentUtxo[]> {
    const url = Config.blockchain.bitcoin.gatewayUrl;

    return this.http
      .post<{ result: UnspentUtxo[] }>(
        url,
        {
          id: 1,
          jsonrpc: '2.0',
          method: 'listunspent',
          params: [1, 9999999],
        },
        this.httpConfig(),
      )
      .then((r) => r.result);
  }

  // --- HELPER --- //
  private httpConfig(): HttpRequestConfig {
    return {
      auth: {
        username: Config.blockchain.bitcoin.rpcUser,
        password: Config.blockchain.bitcoin.rpcPassword,
      },
    };
  }
}
