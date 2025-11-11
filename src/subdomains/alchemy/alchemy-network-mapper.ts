import { Network } from 'alchemy-sdk';
import { GetConfig } from 'src/config/config';
import { Blockchain } from 'src/shared/enums/blockchain.enum';

export class AlchemyNetworkMapper {
  private static blockchainConfig = GetConfig().blockchain;

  private static readonly blockchainToChainIdMap = new Map<Blockchain, number>([
    [Blockchain.ETHEREUM, this.blockchainConfig.ethereum.chainId],
    [Blockchain.ARBITRUM, this.blockchainConfig.arbitrum.chainId],
    [Blockchain.OPTIMISM, this.blockchainConfig.optimism.chainId],
    [Blockchain.POLYGON, this.blockchainConfig.polygon.chainId],
    [Blockchain.BASE, this.blockchainConfig.base.chainId],
    [Blockchain.ROOTSTOCK, this.blockchainConfig.rootstock.chainId],
  ]);

  private static readonly chainIdToNetworkMap = new Map<number, Network>([
    [1, Network.ETH_MAINNET],
    [5, Network.ETH_GOERLI],
    [11155111, Network.ETH_SEPOLIA],

    [42161, Network.ARB_MAINNET],
    [421613, Network.ARB_GOERLI],
    [421614, Network.ARB_SEPOLIA],

    [10, Network.OPT_MAINNET],
    [420, Network.OPT_GOERLI],
    [11155420, Network.OPT_SEPOLIA],

    [137, Network.MATIC_MAINNET],
    [80001, Network.MATIC_MUMBAI],
    [80002, Network.MATIC_AMOY],

    [8453, Network.BASE_MAINNET],
    [84531, Network.BASE_GOERLI],
    [84532, Network.BASE_SEPOLIA],

    [30, Network.ROOTSTOCK_MAINNET],
    [31, Network.ROOTSTOCK_TESTNET],
  ]);

  static getChainId(blockchain: Blockchain): number | undefined {
    return this.blockchainToChainIdMap.get(blockchain);
  }

  static toAlchemyNetworkByChainId(chainId: number): Network | undefined {
    return this.chainIdToNetworkMap.get(chainId);
  }

  static toAlchemyNetworkByBlockchain(blockchain: Blockchain): Network | undefined {
    const chainId = this.blockchainToChainIdMap.get(blockchain);
    return this.chainIdToNetworkMap.get(chainId ?? -1);
  }
}
