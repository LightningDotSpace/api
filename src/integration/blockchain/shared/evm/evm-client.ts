import { Token } from '@uniswap/sdk-core';
import { Contract, ethers } from 'ethers';
import { Config } from 'src/config/config';
import { HttpService } from 'src/shared/services/http.service';
import { AsyncCache } from 'src/shared/utils/async-cache';
import { AlchemyService } from 'src/subdomains/alchemy/services/alchemy.service';
import { EvmUtil } from 'src/subdomains/evm/evm.util';
import { AssetTransferEntity } from 'src/subdomains/master-data/asset/entities/asset-transfer.entity';
import ERC20_ABI from './abi/erc20.abi.json';
import { EvmTokenBalance } from './dto/evm-token-balance.dto';

export interface EvmClientParams {
  alchemyService: AlchemyService;
  gatewayUrl: string;
  apiKey: string;
  chainId: number;
  http?: HttpService;
}

export abstract class EvmClient {
  private readonly alchemyService: AlchemyService;
  private readonly chainId: number;

  private readonly provider: ethers.providers.JsonRpcProvider;
  private readonly tokens = new AsyncCache<Token>();

  constructor(params: EvmClientParams) {
    this.alchemyService = params.alchemyService;
    this.chainId = params.chainId;

    const url = `${params.gatewayUrl}/${params.apiKey ?? ''}`;
    this.provider = new ethers.providers.JsonRpcProvider(url);
  }

  async getNativeCoinBalance(): Promise<number> {
    const balance = await this.alchemyService.getNativeCoinBalance(this.chainId, Config.payment.evmAddress);

    return EvmUtil.fromWeiAmount(balance);
  }

  async getTokenBalance(asset: AssetTransferEntity): Promise<number> {
    const evmTokenBalances = await this.getTokenBalances([asset]);

    return evmTokenBalances[0]?.balance ?? 0;
  }

  async getTokenBalances(assets: AssetTransferEntity[]): Promise<EvmTokenBalance[]> {
    const evmTokenBalances: EvmTokenBalance[] = [];

    const tokenBalances = await this.alchemyService.getTokenBalances(this.chainId, Config.payment.evmAddress, assets);

    for (const tokenBalance of tokenBalances) {
      const token = await this.getTokenByAddress(tokenBalance.contractAddress);
      const balance = EvmUtil.fromWeiAmount(tokenBalance.tokenBalance ?? 0, token.decimals);

      evmTokenBalances.push({ contractAddress: tokenBalance.contractAddress, balance: balance });
    }

    return evmTokenBalances;
  }

  // --- PRIVATE HELPER METHODS --- //

  private async getTokenByAddress(address: string): Promise<Token> {
    const contract = this.getERC20ContractForDex(address);
    return this.getTokenByContract(contract);
  }

  protected getERC20ContractForDex(tokenAddress: string): Contract {
    return new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
  }

  protected async getTokenByContract(contract: Contract): Promise<Token> {
    return this.tokens.get(
      contract.address,
      async () => new Token(this.chainId, contract.address, await contract.decimals()),
    );
  }
}
