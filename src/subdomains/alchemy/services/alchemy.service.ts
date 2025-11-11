import { Injectable } from '@nestjs/common';
import { Alchemy, BigNumber as AlchemyBigNumber, Network as AlchemyNetwork, TokenBalance } from 'alchemy-sdk';
import { Config } from 'src/config/config';
import { AssetTransferEntity } from 'src/subdomains/master-data/asset/entities/asset-transfer.entity';
import { AlchemyNetworkMapper } from '../alchemy-network-mapper';

@Injectable()
export class AlchemyService {
  private readonly alchemyMap = new Map<AlchemyNetwork, Alchemy>();

  async getNativeCoinBalance(chainId: number, address: string): Promise<AlchemyBigNumber> {
    const alchemy = this.getAlchemy(chainId);

    return alchemy.core.getBalance(address, 'latest');
  }

  async getTokenBalances(chainId: number, address: string, assets: AssetTransferEntity[]): Promise<TokenBalance[]> {
    const alchemy = this.getAlchemy(chainId);

    const contractAddresses = assets.filter((a) => a.address != null).map((a) => a.address);

    const tokenBalancesResponse = await alchemy.core.getTokenBalances(address, contractAddresses);

    return tokenBalancesResponse.tokenBalances;
  }

  // --- Alchemy Setup --- //

  private getAlchemy(chainId: number): Alchemy {
    const alchemyNetwork = AlchemyNetworkMapper.toAlchemyNetworkByChainId(chainId);
    if (!alchemyNetwork) throw new Error(`Alchemy not available for chain id ${chainId}`);

    const alchemy = this.alchemyMap.get(alchemyNetwork);
    return alchemy ?? this.setupAlchemy(alchemyNetwork);
  }

  private setupAlchemy(alchemyNetwork: AlchemyNetwork): Alchemy {
    const alchemySettings = {
      apiKey: Config.alchemy.apiKey,
      authToken: Config.alchemy.authToken,
      network: alchemyNetwork,
    };

    const alchemy = new Alchemy(alchemySettings);
    this.alchemyMap.set(alchemyNetwork, alchemy);

    return alchemy;
  }
}
