import { Injectable, InternalServerErrorException, OnModuleInit } from '@nestjs/common';
import { BitcoinClient } from 'src/integration/blockchain/bitcoin/bitcoin-client';
import { BitcoinService } from 'src/integration/blockchain/bitcoin/bitcoin.service';
import { CitreaClient } from 'src/integration/blockchain/citrea/citrea-client';
import { LndChannelDto } from 'src/integration/blockchain/lightning/dto/lnd.dto';
import { LightningClient } from 'src/integration/blockchain/lightning/lightning-client';
import { LightningService } from 'src/integration/blockchain/lightning/services/lightning.service';
import { EvmRegistryService } from 'src/integration/blockchain/shared/evm/registry/evm-registry.service';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { LightningLogger } from 'src/shared/services/lightning-logger';
import { QueueHandler } from 'src/shared/utils/queue-handler';
import { AssetService } from 'src/subdomains/master-data/asset/services/asset.service';
import { CoinGeckoService } from 'src/subdomains/pricing/services/coingecko.service';
import { LightningWalletTotalBalanceDto } from 'src/subdomains/user/application/dto/lightning-wallet.dto';
import { MonitoringBalanceEntity, MonitoringBlockchainBalance } from '../entities/monitoring-balance.entity';
import { MonitoringBalanceRepository } from '../repositories/monitoring-balance.repository';
import { MonitoringRepository } from '../repositories/monitoring.repository';

@Injectable()
export class MonitoringService implements OnModuleInit {
  private readonly logger = new LightningLogger(MonitoringService);

  private readonly bitcoinClient: BitcoinClient;
  private readonly lightningClient: LightningClient;
  private citreaClient: CitreaClient;

  private readonly processBalancesQueue: QueueHandler;

  constructor(
    bitcoinservice: BitcoinService,
    lightningService: LightningService,
    private readonly coinGeckoService: CoinGeckoService,
    private readonly assetService: AssetService,
    private readonly evmRegistryService: EvmRegistryService,
    private readonly monitoringRepository: MonitoringRepository,
    private readonly monitoringBalanceRepository: MonitoringBalanceRepository,
  ) {
    this.bitcoinClient = bitcoinservice.getDefaultClient();
    this.lightningClient = lightningService.getDefaultClient();

    this.processBalancesQueue = new QueueHandler();
  }

  onModuleInit() {
    this.citreaClient = this.evmRegistryService.getClient(Blockchain.CITREA) as CitreaClient;
  }

  // --- LIGHTNING --- //

  async processBalanceMonitoring(
    internalBalances: LightningWalletTotalBalanceDto[],
    customerBalances: LightningWalletTotalBalanceDto[],
  ): Promise<void> {
    this.processBalancesQueue
      .handle<void>(async () => {
        await this.processBalances(internalBalances, customerBalances);
        await this.processChannels();
      })
      .catch((e) => {
        this.logger.error('Error while processing new balances and channels', e);
      });
  }

  private async processBalances(
    internalBalances: LightningWalletTotalBalanceDto[],
    customerBalances: LightningWalletTotalBalanceDto[],
  ): Promise<void> {
    try {
      const blockchainBalance = await this.getBlockchainBalances();

      const btcAccountAsset = await this.assetService.getBtcAccountAssetOrThrow();
      const btcAccountAssetId = btcAccountAsset.id;

      const internalBtcBalance = internalBalances?.find((b) => b.assetId === btcAccountAssetId) ?? {
        assetId: btcAccountAssetId,
        totalBalance: 0,
      };

      const customerBtcBalance = customerBalances.find((b) => b.assetId === btcAccountAssetId) ?? {
        assetId: btcAccountAssetId,
        totalBalance: 0,
      };

      const customerFiatBalances = customerBalances.filter((b) => b.assetId !== btcAccountAssetId);

      await this.processBtcBalance(blockchainBalance, internalBtcBalance, customerBtcBalance);
      await this.processFiatBalances(customerFiatBalances);
    } catch (e) {
      this.logger.error('Error while processing balances', e);
    }
  }

  private async processChannels(): Promise<void> {
    try {
      const channels = await this.getChannels();

      for (const channel of channels) {
        const monitoringEntity = this.monitoringRepository.create({
          type: 'lightningchannel',
          name: channel.remote_pubkey,
          value: `${channel.capacity},${channel.local_balance},${channel.remote_balance}`,
        });

        await this.monitoringRepository.saveIfValueDiff(monitoringEntity);
      }
    } catch (e) {
      this.logger.error('Error while processing channels', e);
    }
  }

  private async processBtcBalance(
    blockchainBalance: MonitoringBlockchainBalance,
    internalBtcBalance: LightningWalletTotalBalanceDto,
    customerBtcBalance: LightningWalletTotalBalanceDto,
  ) {
    const chfPrice = await this.coinGeckoService.getPrice('BTC', 'CHF');
    if (!chfPrice.isValid) throw new InternalServerErrorException(`Invalid price from BTC to CHF`);

    const btcMonitoringEntity = MonitoringBalanceEntity.createAsBtcEntity(
      blockchainBalance,
      internalBtcBalance,
      customerBtcBalance,
      chfPrice,
    );

    await this.monitoringBalanceRepository.saveIfBalanceDiff(btcMonitoringEntity);
  }

  private async processFiatBalances(customerFiatBalances: LightningWalletTotalBalanceDto[]) {
    const zchfBalance = await this.getZchfBalance();

    for (const customerFiatBalance of customerFiatBalances) {
      if (customerFiatBalance.totalBalance) {
        const fiatMonitoringEntity = MonitoringBalanceEntity.createAsChfEntity(zchfBalance, customerFiatBalance);

        await this.monitoringBalanceRepository.saveIfBalanceDiff(fiatMonitoringEntity);
      }
    }
  }

  private async getZchfBalance(): Promise<number> {
    let balance = 0;

    const zchfTransferAssets = await this.assetService.getAllZchfTransferAssets();

    for (const zchfTransferAsset of zchfTransferAssets) {
      if (zchfTransferAsset.address) {
        const evmClient = this.evmRegistryService.getClient(zchfTransferAsset.blockchain);
        balance += await evmClient.getTokenBalance(zchfTransferAsset);
      }
    }

    return balance;
  }

  private async getBlockchainBalances(): Promise<MonitoringBlockchainBalance> {
    return {
      onchainBalance: await this.bitcoinClient.getWalletBalance(),
      lndOnchainBalance: await this.lightningClient.getLndConfirmedWalletBalance(),
      lightningBalance: await this.lightningClient.getLndLightningBalance(),
      citreaBalance: await this.citreaClient.getNativeCoinBalance(),
    };
  }

  private async getChannels(): Promise<LndChannelDto[]> {
    return this.lightningClient.getChannels();
  }
}
