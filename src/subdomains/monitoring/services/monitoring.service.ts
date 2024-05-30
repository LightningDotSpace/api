import { Injectable } from '@nestjs/common';
import { FrankencoinService } from 'src/integration/blockchain/frankencoin/frankencoin.service';
import { LndChannelDto } from 'src/integration/blockchain/lightning/dto/lnd.dto';
import { LightningClient } from 'src/integration/blockchain/lightning/lightning-client';
import { LightningService } from 'src/integration/blockchain/lightning/services/lightning.service';
import { EvmRegistryService } from 'src/integration/blockchain/shared/evm/registry/evm-registry.service';
import { LightningLogger } from 'src/shared/services/lightning-logger';
import { QueueHandler } from 'src/shared/utils/queue-handler';
import { AlchemyWebhookDto } from 'src/subdomains/alchemy/dto/alchemy-webhook.dto';
import { AssetService } from 'src/subdomains/master-data/asset/services/asset.service';
import { LightningWalletTotalBalanceDto } from 'src/subdomains/user/application/dto/lightning-wallet.dto';
import { MonitoringFrankencoinDto } from '../dto/monitoring-frankencoin.dto';
import { MonitoringBalanceRepository } from '../repositories/monitoring-balance.repository';
import { MonitoringRepository } from '../repositories/monitoring.repository';

@Injectable()
export class MonitoringService {
  private readonly logger = new LightningLogger(MonitoringService);

  private readonly client: LightningClient;

  private readonly processBalancesQueue: QueueHandler;
  private readonly processFrankencoinQueue: QueueHandler;

  constructor(
    lightningService: LightningService,
    private readonly assetService: AssetService,
    private readonly evmRegistryService: EvmRegistryService,
    private readonly frankencoinService: FrankencoinService,
    private readonly monitoringRepository: MonitoringRepository,
    private readonly monitoringBalanceRepository: MonitoringBalanceRepository,
  ) {
    this.client = lightningService.getDefaultClient();

    this.processBalancesQueue = new QueueHandler();
    this.processFrankencoinQueue = new QueueHandler();
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
    const btcMonitoringEntity = this.monitoringBalanceRepository.create({
      asset: { id: customerBtcBalance.assetId },
      onchainBalance: onchainBalance,
      lightningBalance: lightningBalance,
      customerBalance: customerBtcBalance.totalBalance,
    });

    await this.monitoringBalanceRepository.saveIfBalanceDiff(btcMonitoringEntity);
  }

  private async processFiatBalances(customerFiatBalances: LightningWalletTotalBalanceDto[]) {
    const zchfBalance = await this.getZchfBalance();

    for (const customerFiatBalance of customerFiatBalances) {
      if (customerFiatBalance.totalBalance) {
        const fiatMonitoringEntity = this.monitoringBalanceRepository.create({
          asset: { id: customerFiatBalance.assetId },
          onchainBalance: zchfBalance,
          lightningBalance: 0,
          customerBalance: customerFiatBalance.totalBalance,
        });

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

  // --- Frankencoin --- //

  async processFrankencoinMonitoring(_dto: AlchemyWebhookDto): Promise<void> {
    this.processFrankencoinQueue
      .handle<void>(async () => {
        await this.processFrankencoin();
      })
      .catch((e) => {
        this.logger.error('Error while processing frankencoin info', e);
      });
  }

  private async processFrankencoin(): Promise<void> {
    try {
      const zchfTotalSupply = await this.frankencoinService.getZchfTotalSupply();
      const fpsMarketCap = await this.frankencoinService.getFpsMarketCap();
      const totalValueLocked = await this.frankencoinService.getTvl();

      await this.saveFrankencoinInfo('zchfTotalSupply', zchfTotalSupply);
      await this.saveFrankencoinInfo('fpsMarketCap', fpsMarketCap);
      await this.saveFrankencoinInfo('totalValueLocked', totalValueLocked);
    } catch (e) {
      this.logger.error('Error while processing frankencoin', e);
    }
  }

  private async saveFrankencoinInfo(name: string, value: number) {
    const monitoringEntity = this.monitoringRepository.create({
      type: 'frankencoininfo',
      name: name,
      value: `${value}`,
    });

    await this.monitoringRepository.saveIfValueDiff(monitoringEntity);
  }

  async frankencoinInfo(): Promise<MonitoringFrankencoinDto> {
    const monitoringEntities = await this.monitoringRepository.findBy({ type: 'frankencoininfo' });

    const zchfTotalSupplyEntity = monitoringEntities.find((m) => m.name === 'zchfTotalSupply');
    const fpsMarketCapEntity = monitoringEntities.find((m) => m.name === 'fpsMarketCap');
    const totalValueLockedEntity = monitoringEntities.find((m) => m.name === 'totalValueLocked');

    return {
      zchfTotalSupply: Number(zchfTotalSupplyEntity?.value ?? 0),
      fpsMarketCap: Number(fpsMarketCapEntity?.value ?? 0),
      totalValueLocked: Number(totalValueLockedEntity?.value ?? 0),
    };
  }

  async saveWebhookInfo(webhookId: string, webhookSigningKey: string) {
    const monitoringEntity = this.monitoringRepository.create({
      type: 'alchemywebhookinfo',
      name: webhookId,
      value: webhookSigningKey,
    });

    await this.monitoringRepository.saveIfValueDiff(monitoringEntity);
  }

  async deleteWebhookInfo(webhookId: string) {
    const monitoringEntity = this.monitoringRepository.create({
      type: 'alchemywebhookinfo',
      name: webhookId,
    });

    await this.monitoringRepository.delete(monitoringEntity);
  }

  async getWebhookSigningKey(webhookId: string): Promise<string | undefined> {
    const monitoringEntity = await this.monitoringRepository.findOneBy({ type: 'alchemywebhookinfo', name: webhookId });
    if (!monitoringEntity) return;

    return monitoringEntity.value;
  }
}
