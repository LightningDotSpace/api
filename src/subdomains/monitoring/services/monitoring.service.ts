import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { LndChannelDto } from 'src/integration/blockchain/lightning/dto/lnd.dto';
import { LightningClient } from 'src/integration/blockchain/lightning/lightning-client';
import { LightningService } from 'src/integration/blockchain/lightning/services/lightning.service';
import { EvmRegistryService } from 'src/integration/blockchain/shared/evm/registry/evm-registry.service';
import { LightningLogger } from 'src/shared/services/lightning-logger';
import { QueueHandler } from 'src/shared/utils/queue-handler';
import { AssetService } from 'src/subdomains/master-data/asset/services/asset.service';
import { CoinGeckoService } from 'src/subdomains/pricing/services/coingecko.service';
import { LightningWalletTotalBalanceDto } from 'src/subdomains/user/application/dto/lightning-wallet.dto';
import { MonitoringBalanceEntity } from '../entities/monitoring-balance.entity';
import { MonitoringBalanceRepository } from '../repositories/monitoring-balance.repository';
import { MonitoringRepository } from '../repositories/monitoring.repository';

@Injectable()
export class MonitoringService {
  private readonly logger = new LightningLogger(MonitoringService);

  private readonly client: LightningClient;

  private readonly processBalancesQueue: QueueHandler;

  constructor(
    lightningService: LightningService,
    private readonly coinGeckoService: CoinGeckoService,
    private readonly assetService: AssetService,
    private readonly evmRegistryService: EvmRegistryService,
    private readonly monitoringRepository: MonitoringRepository,
    private readonly monitoringBalanceRepository: MonitoringBalanceRepository,
  ) {
    this.client = lightningService.getDefaultClient();

    this.processBalancesQueue = new QueueHandler();
  }

  // --- LIGHTNING --- //

  async processBalanceMonitoring(customerBalances: LightningWalletTotalBalanceDto[]): Promise<void> {
    this.processBalancesQueue
      .handle<void>(async () => {
        await this.processBalances(customerBalances);
        await this.processChannels();
      })
      .catch((e) => {
        this.logger.error('Error while processing new balances and channels', e);
      });
  }

  private async processBalances(customerBalances: LightningWalletTotalBalanceDto[]): Promise<void> {
    try {
      const onchainBalance = await this.getOnchainBalance();
      const lightningBalance = await this.getLightningBalance();

      const btcAccountAsset = await this.assetService.getBtcAccountAssetOrThrow();
      const btcAccountAssetId = btcAccountAsset.id;

      const customerBtcBalance = customerBalances.find((b) => b.assetId === btcAccountAssetId) ?? {
        assetId: btcAccountAssetId,
        totalBalance: 0,
      };

      const customerFiatBalances = customerBalances.filter((b) => b.assetId !== btcAccountAssetId);

      await this.processBtcBalance(onchainBalance, lightningBalance, customerBtcBalance);
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
    onchainBalance: number,
    lightningBalance: number,
    customerBtcBalance: LightningWalletTotalBalanceDto,
  ) {
    const chfPrice = await this.coinGeckoService.getPrice('BTC', 'CHF');
    if (!chfPrice.isValid) throw new InternalServerErrorException(`Invalid price from BTC to CHF`);

    const btcMonitoringEntity = MonitoringBalanceEntity.createAsBtcEntity(
      onchainBalance,
      lightningBalance,
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

  private async getOnchainBalance(): Promise<number> {
    return this.client.getLndConfirmedWalletBalance();
  }

  private async getLightningBalance(): Promise<number> {
    return this.client.getLndLightningBalance();
  }

  private async getChannels(): Promise<LndChannelDto[]> {
    return this.client.getChannels();
  }
}
