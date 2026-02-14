import { Environment, GetConfig } from 'src/config/config';
import { EvmUtil } from 'src/subdomains/evm/evm.util';
import { LightningHelper } from '../lightning/lightning-helper';
import { EvmClient, EvmClientParams } from '../shared/evm/evm-client';

export class CitreaClient extends EvmClient {
  private readonly walletAddress: string;

  constructor(params: EvmClientParams) {
    super(params);

    const config = GetConfig();
    this.walletAddress =
      config.environment === Environment.LOC
        ? ''
        : EvmUtil.createWallet({ seed: config.evm.walletSeed, index: 0 }).address;
  }

  async getNativeCoinBalance(): Promise<number> {
    const balance = await this.provider.getBalance(this.walletAddress);
    return LightningHelper.btcToSat(EvmUtil.fromWeiAmount(balance.toString()));
  }

  async getTokenBalanceByAddress(tokenAddress: string, decimals: number): Promise<number> {
    const contract = this.getERC20ContractForDex(tokenAddress);
    const balance = await contract.balanceOf(this.walletAddress);

    return EvmUtil.fromWeiAmount(balance, decimals);
  }
}
