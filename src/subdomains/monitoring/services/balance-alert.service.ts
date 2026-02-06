import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BALANCE_THRESHOLDS, BalanceThreshold } from 'src/config/balance-thresholds.config';
import { Config, Process } from 'src/config/config';
import { TelegramService } from 'src/integration/telegram/services/telegram.service';
import { LightningLogger } from 'src/shared/services/lightning-logger';
import { Lock } from 'src/shared/utils/lock';
import { BalanceDto } from 'src/subdomains/boltz/dto/boltz.dto';
import { BoltzBalanceService } from 'src/subdomains/boltz/services/boltz-balance.service';

enum AlertType {
  LOW = 'LOW',
  HIGH = 'HIGH',
}

@Injectable()
export class BalanceAlertService {
  private readonly logger = new LightningLogger(BalanceAlertService);

  private readonly alertState = new Map<string, boolean>();

  constructor(
    private readonly telegramService: TelegramService,
    private readonly boltzBalanceService: BoltzBalanceService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  @Lock(1800)
  async processBalanceAlerts(): Promise<void> {
    if (Config.processDisabled(Process.MONITORING)) return;

    try {
      const balances = await this.boltzBalanceService.getWalletBalance();
      await this.checkAndAlert(balances);
    } catch (e) {
      this.logger.error('Error processing balance alerts', e);
    }
  }

  async checkAndAlert(balances: BalanceDto[]): Promise<void> {
    for (const threshold of BALANCE_THRESHOLDS) {
      const balance = balances.find(
        (b) =>
          b.blockchain === threshold.blockchain &&
          b.asset === threshold.asset &&
          b.direction === threshold.direction,
      );

      if (!balance) continue;

      await this.checkThreshold(threshold, balance.balance, AlertType.LOW);
      await this.checkThreshold(threshold, balance.balance, AlertType.HIGH);
    }
  }

  private async checkThreshold(
    threshold: BalanceThreshold,
    balance: number,
    alertType: AlertType,
  ): Promise<void> {
    const directionSuffix = threshold.direction ? `:${threshold.direction}` : '';
    const key = `${threshold.blockchain}:${threshold.asset}${directionSuffix}:${alertType}`;
    const isActive = this.alertState.get(key) ?? false;

    const thresholdValue = alertType === AlertType.LOW ? threshold.minBalance : threshold.maxBalance;
    const isViolation =
      alertType === AlertType.LOW ? balance < thresholdValue : balance > thresholdValue;
    const isRecovered =
      alertType === AlertType.LOW ? balance >= thresholdValue : balance <= thresholdValue;

    if (isViolation && !isActive) {
      const sent = await this.sendBalanceAlert(alertType, threshold, balance, thresholdValue);

      if (sent) {
        this.alertState.set(key, true);
        this.logger.info(`Sent ${alertType} alert for ${threshold.asset} on ${threshold.blockchain}`);
      }
    } else if (isRecovered && isActive) {
      await this.sendRecoveryMessage(threshold, balance);
      this.alertState.set(key, false);
      this.logger.info(`Cleared ${alertType} alert for ${threshold.asset} on ${threshold.blockchain}`);
    }
  }

  private async sendBalanceAlert(
    alertType: AlertType,
    threshold: BalanceThreshold,
    balance: number,
    thresholdValue: number,
  ): Promise<boolean> {
    const description =
      alertType === AlertType.LOW
        ? 'Balance is below minimum threshold!'
        : 'Balance exceeds maximum threshold!';

    const directionInfo = threshold.direction ? ` (${threshold.direction} channels)` : '';

    return this.telegramService.sendMessage(`
🔴 <b>Balance Alert: ${alertType}</b>

Asset: ${threshold.asset}
Chain: ${threshold.blockchain}${directionInfo}
Balance: ${balance.toFixed(6)}
Threshold: ${thresholdValue.toFixed(6)}

${description}
`);
  }

  private async sendRecoveryMessage(threshold: BalanceThreshold, balance: number): Promise<void> {
    const directionInfo = threshold.direction ? ` (${threshold.direction} channels)` : '';

    await this.telegramService.sendMessage(`
✅ <b>Balance Recovered</b>

Asset: ${threshold.asset}
Chain: ${threshold.blockchain}${directionInfo}
Balance: ${balance.toFixed(6)}

Balance is back within normal range.
`);
  }
}
