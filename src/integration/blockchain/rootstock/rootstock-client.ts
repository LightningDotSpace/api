import { Config } from 'src/config/config';
import { EvmUtil } from 'src/subdomains/evm/evm.util';
import { AssetTransferEntity } from 'src/subdomains/master-data/asset/entities/asset-transfer.entity';
import { LightningHelper } from '../lightning/lightning-helper';
import { EvmTokenBalance } from '../shared/evm/dto/evm-token-balance.dto';
import { EvmClient, EvmClientParams } from '../shared/evm/evm-client';

export class RootstockClient extends EvmClient {
  constructor(private readonly params: EvmClientParams) {
    super(params);
  }

  async getNativeCoinBalance(): Promise<number> {
    const http = this.params.http;
    if (!http) throw new Error('No HTTP found');

    const url = `${this.params.gatewayUrl}/${this.params.apiKey ?? ''}`;

    const walletAddress = EvmUtil.createWallet({ seed: Config.evm.walletSeed, index: 0 }).address;

    const balanceResult = await http
      .post<{ result: number }>(url, {
        id: 1,
        jsonrpc: '2.0',
        method: 'eth_getBalance',
        params: [walletAddress, 'latest'],
      })
      .then((r) => r.result);

    return LightningHelper.btcToSat(EvmUtil.fromWeiAmount(balanceResult));
  }

  async getTokenBalance(_asset: AssetTransferEntity): Promise<number> {
    throw new Error('Method not implemented.');
  }

  async getTokenBalances(_assets: AssetTransferEntity[]): Promise<EvmTokenBalance[]> {
    throw new Error('Method not implemented.');
  }
}
