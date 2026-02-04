import { Injectable, OnModuleInit } from '@nestjs/common';
import { ethers } from 'ethers';
import { GetConfig } from 'src/config/config';
import { BitcoinClient } from 'src/integration/blockchain/bitcoin/bitcoin-client';
import { BitcoinService } from 'src/integration/blockchain/bitcoin/bitcoin.service';
import { LightningClient } from 'src/integration/blockchain/lightning/lightning-client';
import { LightningHelper } from 'src/integration/blockchain/lightning/lightning-helper';
import { LightningService } from 'src/integration/blockchain/lightning/services/lightning.service';
import ERC20_ABI from 'src/integration/blockchain/shared/evm/abi/erc20.abi.json';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { LightningLogger } from 'src/shared/services/lightning-logger';
import { Util } from 'src/shared/utils/util';
import { AlchemyNetworkMapper } from 'src/subdomains/alchemy/alchemy-network-mapper';
import { AlchemyService } from 'src/subdomains/alchemy/services/alchemy.service';
import { EvmUtil } from 'src/subdomains/evm/evm.util';
import { BalanceDto, Direction } from '../dto/boltz.dto';
import { AssetBoltzRepository } from '../repositories/asset-boltz.repository';

interface ChainConfig {
  blockchain: Blockchain;
  chainId: number;
  usesAlchemy: boolean;
}

@Injectable()
export class BoltzBalanceService implements OnModuleInit {
  private readonly logger = new LightningLogger(BoltzBalanceService);

  private readonly bitcoinClient: BitcoinClient;
  private readonly lightningClient: LightningClient;

  private evmWalletAddress = '';
  private citreaProvider: ethers.providers.JsonRpcProvider | null = null;
  private chains: ChainConfig[] = [];

  constructor(
    bitcoinService: BitcoinService,
    lightningService: LightningService,
    private readonly alchemyService: AlchemyService,
    private readonly assetBoltzRepository: AssetBoltzRepository,
  ) {
    this.bitcoinClient = bitcoinService.getDefaultClient();
    this.lightningClient = lightningService.getDefaultClient();
  }

  onModuleInit(): void {
    const config = GetConfig();
    this.evmWalletAddress = config.boltz.evmWalletAddress;
    const blockchainConfig = config.blockchain;

    this.chains = [
      { blockchain: Blockchain.ETHEREUM, chainId: blockchainConfig.ethereum.chainId, usesAlchemy: true },
      { blockchain: Blockchain.POLYGON, chainId: blockchainConfig.polygon.chainId, usesAlchemy: true },
      { blockchain: Blockchain.CITREA, chainId: blockchainConfig.citrea.chainId, usesAlchemy: false },
    ];

    if (blockchainConfig.citrea.gatewayUrl) {
      this.citreaProvider = new ethers.providers.JsonRpcProvider(blockchainConfig.citrea.gatewayUrl);
    }
  }

  async getWalletBalance(): Promise<BalanceDto[]> {
    const balances: BalanceDto[] = [];

    balances.push(... await this.getBtcBalances());
    balances.push(... await this.getLightningBalances());
    balances.push(... await this.getEvmBalances());

    return balances;
  }

  private async getBtcBalances(): Promise<BalanceDto[]> {
    const balances: BalanceDto[] = [];

    try {
      const onchainNode = await this.bitcoinClient.getWalletBalance();
      balances.push({ blockchain: Blockchain.BITCOIN, asset: 'BTC', balance: LightningHelper.satToBtc(onchainNode) });
    } catch (error) {
      this.logger.warn(`Failed to fetch BTC onchain balance: ${error.message}`);
    }

    try {
      const lndNode = await this.lightningClient.getLndConfirmedWalletBalance();
      balances.push({ blockchain: Blockchain.LIGHTNING, asset: 'BTC', balance: LightningHelper.satToBtc(lndNode) });
    } catch (error) {
      this.logger.warn(`Failed to fetch LND wallet balance: ${error.message}`);
    }

    return balances;
  }

  private async getLightningBalances(): Promise<BalanceDto[]> {
    const balances: BalanceDto[] = [];

    try {
      const channels = await this.lightningClient.getChannels();
      const outgoing = channels.reduce((sum, ch) => sum + Number(ch.local_balance), 0);
      const incoming = channels.reduce((sum, ch) => sum + Number(ch.remote_balance), 0);

      balances.push({ blockchain: Blockchain.LIGHTNING, asset: 'BTC', balance: LightningHelper.satToBtc(outgoing), direction: Direction.OUTGOING});
      balances.push({ blockchain: Blockchain.LIGHTNING, asset: 'BTC', balance: LightningHelper.satToBtc(incoming), direction: Direction.INCOMING });
    } catch (error) {
      this.logger.warn(`Failed to fetch Lightning balance: ${error.message}`);
    }

    return balances;
  }

  private async getEvmBalances(): Promise<BalanceDto[]> {
    const balances: BalanceDto[] = [];

    // Citrea cBTC (native balance)
    const citreaBalance = await this.getCitreaNativeBalance();
    if (citreaBalance) balances.push(citreaBalance);

    // Token balances from all chains
    for (const chain of this.chains) {
      try {
        if (chain.chainId <= 0) continue;

        const tokenBalances = chain.usesAlchemy
          ? await this.getAlchemyTokenBalances(chain)
          : await this.getDirectTokenBalances(chain);
        balances.push(...tokenBalances);
      } catch (error) {
        this.logger.warn(`Failed to fetch balances for ${chain.blockchain}: ${error.message}`);
      }
    }

    return balances;
  }

  private async getCitreaNativeBalance(): Promise<BalanceDto | null> {
    if (!this.citreaProvider || !this.evmWalletAddress) return null;

    try {
      const balanceWei = await this.citreaProvider.getBalance(this.evmWalletAddress);
      const balance = EvmUtil.fromWeiAmount(balanceWei.toString());

      return { blockchain: Blockchain.CITREA, asset: 'cBTC', balance };
    } catch (error) {
      this.logger.warn(`Failed to fetch Citrea native balance: ${error.message}`);
      return null;
    }
  }

  private async getAlchemyTokenBalances(chain: ChainConfig): Promise<BalanceDto[]> {
    const balances: BalanceDto[] = [];

    try {
      if (!AlchemyNetworkMapper.toAlchemyNetworkByChainId(chain.chainId)) return balances;

      if (!this.evmWalletAddress) return balances;

      const tokens = await this.assetBoltzRepository.getByBlockchain(chain.blockchain);
      if (tokens.length === 0) return balances;

      const tokenAddresses = tokens.map((t) => t.address);
      const tokenBalances = await this.alchemyService.getTokenBalancesByAddresses(chain.chainId, this.evmWalletAddress, tokenAddresses);

      for (const tokenBalance of tokenBalances) {
        const token = tokens.find((t) => Util.equalsIgnoreCase(t.address,tokenBalance.contractAddress));
        if (!token) continue;

        const rawBalance = BigInt(tokenBalance.tokenBalance ?? '0');

        balances.push({
          blockchain: chain.blockchain,
          asset: token.name,
          balance: EvmUtil.fromWeiAmount(rawBalance.toString(), token.decimals),
        });
      }
    } catch (error) {
      this.logger.warn(`Failed to fetch Alchemy token balances for ${chain.blockchain}: ${error.message}`);
    }

    return balances;
  }

  private async getDirectTokenBalances(chain: ChainConfig): Promise<BalanceDto[]> {
    const balances: BalanceDto[] = [];

    if (!this.citreaProvider || !this.evmWalletAddress) return balances;
    if (chain.blockchain !== Blockchain.CITREA) return balances;

    const tokens = await this.assetBoltzRepository.getByBlockchain(chain.blockchain);
    if (tokens.length === 0) return balances;

    for (const token of tokens) {
      try {
        const contract = new ethers.Contract(token.address, ERC20_ABI, this.citreaProvider);
        const rawBalance: ethers.BigNumber = await contract.balanceOf(this.evmWalletAddress);

        balances.push({
          blockchain: chain.blockchain,
          asset: token.name,
          balance: EvmUtil.fromWeiAmount(rawBalance.toString(), token.decimals),
        });
      } catch (error) {
        this.logger.warn(`Failed to fetch ${token.name} balance on ${chain.blockchain}: ${error.message}`);
      }
    }

    return balances;
  }
}
