import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Config, Process } from 'src/config/config';
import { LightningClient } from 'src/integration/blockchain/lightning/lightning-client';
import { LightningService } from 'src/integration/blockchain/lightning/services/lightning.service';
import { LightningLogger } from 'src/shared/services/lightning-logger';
import { Lock } from 'src/shared/utils/lock';
import { AssetService } from 'src/subdomains/master-data/asset/services/asset.service';
import { LightningWalletTotalBalanceDto } from 'src/subdomains/user/application/dto/lightning-wallet.dto';
import { LightningWalletService } from 'src/subdomains/user/application/services/lightning-wallet.service';
import { MonitoringBalanceRepository } from '../repositories/monitoring-balance.repository';

@Injectable()
export class MonitoringService {
  private readonly logger = new LightningLogger(MonitoringService);

  private readonly client: LightningClient;

  constructor(
    lightningService: LightningService,
    private readonly assetService: AssetService,
    private readonly lightningWalletService: LightningWalletService,
    private monitoringBalanceRepository: MonitoringBalanceRepository,
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
      await this.processFiatBalances(onchainBalance, lightningBalance, customerFiatBalances);
    } catch (e) {
      this.logger.error('Error while process balances', e);
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

  private async processFiatBalances(
    onchainBalance: number,
    lightningBalance: number,
    customerFiatBalances: LightningWalletTotalBalanceDto[],
  ) {
    for (const customerFiatBalance of customerFiatBalances) {
      if (customerFiatBalance.totalBalance) {
        const fiatMonitoringEntity = this.monitoringBalanceRepository.create({
          asset: { id: customerFiatBalance.assetId },
          onchainBalance: onchainBalance,
          lightningBalance: lightningBalance,
          customerBalance: customerFiatBalance.totalBalance,
        });

        await this.monitoringBalanceRepository.saveIfBalanceDiff(fiatMonitoringEntity);
      }
    }
  }

  private async getOnchainBalance(): Promise<number> {
    return this.client.getLndConfirmedWalletBalance();
  }

  private async getLightningBalance(): Promise<number> {
    return this.client.getLndLightningBalance();
  }

  private async getCustomerBalance(): Promise<LightningWalletTotalBalanceDto[]> {
    return this.lightningWalletService.getLightningWalletTotalBalances();
  }
}
