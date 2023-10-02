import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Config, Process } from 'src/config/config';
import { LnBitsUsermanagerWalletDto } from 'src/integration/blockchain/lightning/dto/lnbits.dto';
import { LightningClient } from 'src/integration/blockchain/lightning/lightning-client';
import { LightningHelper } from 'src/integration/blockchain/lightning/lightning-helper';
import { LightningService } from 'src/integration/blockchain/lightning/services/lightning.service';
import { LightningLogger } from 'src/shared/services/lightning-logger';
import { Lock } from 'src/shared/utils/lock';
import { LightningTransactionService } from 'src/subdomains/lightning/services/lightning-transaction.service';
import { UserTransactionRepository } from 'src/subdomains/user/application/repositories/user-transaction.repository';
import {
  UserTransactionEntity,
  UserTransactionType,
} from 'src/subdomains/user/domain/entities/user-transaction.entity';
import { LightningWalletEntity } from '../../domain/entities/lightning-wallet.entity';
import { LightingWalletRepository } from '../repositories/lightning-wallet.repository';

@Injectable()
export class LightningWalletService {
  private readonly logger = new LightningLogger(LightningWalletService);

  private readonly client: LightningClient;

  constructor(
    lightningService: LightningService,
    private readonly lightningTransactionService: LightningTransactionService,
    private readonly userTransactionRepository: UserTransactionRepository,
    private readonly lightingWalletRepository: LightingWalletRepository,
  ) {
    this.client = lightningService.getDefaultClient();
  }

  @Cron(CronExpression.EVERY_HOUR)
  @Lock()
  async processUpdateLightningWalletBalances(): Promise<void> {
    if (Config.processDisabled(Process.UPDATE_WALLET_BALANCE)) return;

    try {
      let lightningWalletEntities = await this.lightingWalletRepository.first(1000);

      while (lightningWalletEntities.length) {
        await this.doProcessUpdateLightningWalletBalances(lightningWalletEntities);
        lightningWalletEntities = await this.lightingWalletRepository.next();
      }
    } catch (e) {
      this.logger.error('Error while updating wallet balances', e);
    }
  }

  private async doProcessUpdateLightningWalletBalances(
    lightningWalletEntities: LightningWalletEntity[],
  ): Promise<void> {
    for (const lightningWalletEntity of lightningWalletEntities) {
      const lnbitsWallet = await this.client.getLnBitsWallet(lightningWalletEntity.adminKey);

      const lightningWalletEntityBalance = lightningWalletEntity.balance;
      const lnbitsWalletBalance = LightningHelper.btcToSat(lnbitsWallet.balance);

      if (lightningWalletEntityBalance !== lnbitsWalletBalance) {
        await this.lightingWalletRepository.update(lightningWalletEntity.id, {
          balance: lnbitsWalletBalance,
        });
      }
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  @Lock()
  async syncLightningUserTransactions(): Promise<void> {
    if (Config.processDisabled(Process.UPDATE_LIGHTNING_USER_TRANSACTION)) return;

    const databaseUserTransactionEntities = await this.userTransactionRepository.getEntriesWithMaxCreationTimestamp();

    if (0 === databaseUserTransactionEntities.length) {
      await this.saveLightningUserTransactions();
      return;
    }

    await this.saveLightningUserTransactions(databaseUserTransactionEntities);
  }

  private async saveLightningUserTransactions(
    databaseUserTransactionEntities?: UserTransactionEntity[],
  ): Promise<UserTransactionEntity[]> {
    const newUserTransactionEntities: UserTransactionEntity[] = [];

    const allUserWallets = await this.client.getUserWallets();

    const startDate = databaseUserTransactionEntities
      ? new Date(databaseUserTransactionEntities[0].creationTimestamp.getTime())
      : new Date(0);

    for (const wallet of allUserWallets) {
      const userTransactionEntities = await this.getUserWalletTransactions(startDate, wallet);
      newUserTransactionEntities.push(...userTransactionEntities);
    }

    newUserTransactionEntities.sort(
      (t1, t2) => t1.lightningTransaction.id - t2.lightningTransaction.id || (t1.amount > t2.amount ? -1 : 1),
    );

    const savedUserTransactionEntities = await this.userTransactionRepository.saveMany(newUserTransactionEntities);
    await this.updateLightningWalletBalances(savedUserTransactionEntities);

    return savedUserTransactionEntities;
  }

  private async updateLightningWalletBalances(userTransactionEntities: UserTransactionEntity[]): Promise<void> {
    for (const userTransactionEntity of userTransactionEntities) {
      const userTransactionBalance = userTransactionEntity.balance;

      if (userTransactionBalance) {
        const lightningWalletEntity = userTransactionEntity.lightningWallet;

        if (lightningWalletEntity.balance !== userTransactionBalance) {
          await this.lightingWalletRepository.update(lightningWalletEntity.id, {
            balance: userTransactionBalance,
          });
        }
      }
    }
  }

  private async getUserWalletTransactions(
    startDate: Date,
    wallet: LnBitsUsermanagerWalletDto,
  ): Promise<UserTransactionEntity[]> {
    const userTransactionEntities: UserTransactionEntity[] = [];

    const lightningWalletEntity = await this.lightingWalletRepository.getByWalletId(wallet.id);

    const allUserWalletTransactions = await this.client.getUserWalletTransactions(wallet.id);
    const newUserWalletTransactions = allUserWalletTransactions.filter((t) => t.time * 1000 > startDate.getTime());

    for (const userWalletTransaction of newUserWalletTransactions) {
      const lightningTransactionEntity = await this.lightningTransactionService.getLightningTransactionByTransaction(
        userWalletTransaction.payment_hash,
      );

      const userTransactionEntity = this.userTransactionRepository.create({
        type: userWalletTransaction.checking_id.startsWith('internal')
          ? UserTransactionType.INTERN
          : UserTransactionType.EXTERN,
        amount: LightningHelper.msatToSat(userWalletTransaction.amount),
        fee: LightningHelper.msatToSat(userWalletTransaction.fee),
        creationTimestamp: new Date(userWalletTransaction.time * 1000),
        expiresTimestamp: new Date(userWalletTransaction.expiry * 1000),
        tag: userWalletTransaction.extra.tag,
        lightningWallet: lightningWalletEntity,
        lightningTransaction: lightningTransactionEntity,
      });

      userTransactionEntities.push(userTransactionEntity);
    }

    if (userTransactionEntities.length > 0) {
      const lnbitsWallet = await this.client.getLnBitsWallet(wallet.adminkey);
      userTransactionEntities[userTransactionEntities.length - 1].balance = LightningHelper.btcToSat(
        lnbitsWallet.balance,
      );
    }

    return userTransactionEntities;
  }
}
