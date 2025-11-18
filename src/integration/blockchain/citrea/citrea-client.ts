import { Config } from 'src/config/config';
import { EvmUtil } from 'src/subdomains/evm/evm.util';
import { AssetTransferEntity } from 'src/subdomains/master-data/asset/entities/asset-transfer.entity';
import { LightningHelper } from '../lightning/lightning-helper';
import { EvmTokenBalance } from '../shared/evm/dto/evm-token-balance.dto';
import { EvmClient, EvmClientParams } from '../shared/evm/evm-client';

export class CitreaClient extends EvmClient {
  constructor(private readonly params: EvmClientParams) {
    super(params);
  }

  async getNativeCoinBalance(): Promise<number> {
    const balance = await this.provider.getBalance(Config.blockchain.citrea.walletAddress);
    return LightningHelper.btcToSat(EvmUtil.fromWeiAmount(balance.toString()));
  }

  async getTokenBalance(_asset: AssetTransferEntity): Promise<number> {
    throw new Error('Method not implemented.');
  }

  async getTokenBalances(_assets: AssetTransferEntity[]): Promise<EvmTokenBalance[]> {
    throw new Error('Method not implemented.');
  }
}
