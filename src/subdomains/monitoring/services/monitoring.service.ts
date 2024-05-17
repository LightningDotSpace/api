import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Config, Process } from 'src/config/config';
import { LndChannelDto } from 'src/integration/blockchain/lightning/dto/lnd.dto';
import { LightningClient } from 'src/integration/blockchain/lightning/lightning-client';
import { LightningService } from 'src/integration/blockchain/lightning/services/lightning.service';
import { EvmRegistryService } from 'src/integration/blockchain/shared/evm/registry/evm-registry.service';
import { LightningLogger } from 'src/shared/services/lightning-logger';
import { Lock } from 'src/shared/utils/lock';
import { AssetService } from 'src/subdomains/master-data/asset/services/asset.service';
import { LightningWalletTotalBalanceDto } from 'src/subdomains/user/application/dto/lightning-wallet.dto';
import { LightningWalletService } from 'src/subdomains/user/application/services/lightning-wallet.service';
import { MonitoringBalanceRepository } from '../repositories/monitoring-balance.repository';
import { MonitoringRepository } from '../repositories/monitoring.repository';

@Injectable()
export class MonitoringService {
  private readonly logger = new LightningLogger(MonitoringService);

  private readonly client: LightningClient;

  constructor(
    lightningService: LightningService,
    private readonly assetService: AssetService,
    private readonly lightningWalletService: LightningWalletService,
    private readonly evmRegistryService: EvmRegistryService,
    private readonly monitoringRepository: MonitoringRepository,
    private readonly monitoringBalanceRepository: MonitoringBalanceRepository,
  ) {
    this.client = lightningService.getDefaultClient();
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  @Lock()
  async processBalances(): Promise<void> {
    if (Config.processDisabled(Process.PROCESS_MONITORING)) return;

    try {
      const onchainBalance = await this.getOnchainBalance();
      const lightningBalance = await this.getLightningBalance();
      const customerBalances = await this.getCustomerBalance();

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

  @Cron(CronExpression.EVERY_5_SECONDS)
  @Lock()
  async processChannels(): Promise<void> {
    if (Config.processDisabled(Process.PROCESS_MONITORING)) return;

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

  private async getCustomerBalance(): Promise<LightningWalletTotalBalanceDto[]> {
    return this.lightningWalletService.getLightningWalletTotalBalances();
  }
}
