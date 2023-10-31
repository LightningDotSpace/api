import { Injectable, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Config, Process } from 'src/config/config';
import { LightningClient } from 'src/integration/blockchain/lightning/lightning-client';
import { LightningHelper } from 'src/integration/blockchain/lightning/lightning-helper';
import { LightningService } from 'src/integration/blockchain/lightning/services/lightning.service';
import { LightningLogger } from 'src/shared/services/lightning-logger';
import { Lock } from 'src/shared/utils/lock';
import { Util } from 'src/shared/utils/util';
import { LightningTransactionService } from 'src/subdomains/lightning/services/lightning-transaction.service';
import { UserTransactionRepository } from 'src/subdomains/user/application/repositories/user-transaction.repository';
import {
  UserTransactionEntity,
  UserTransactionType,
} from 'src/subdomains/user/domain/entities/user-transaction.entity';
import { LightningWalletEntity } from '../../domain/entities/lightning-wallet.entity';
import { LightingWalletRepository } from '../repositories/lightning-wallet.repository';
import { WalletRepository } from '../repositories/wallet.repository';

interface LightningWalletInfoDto {
  lnbitsWalletId: string;
  adminKey: string;
}

@Injectable()
export class LightningWalletService {
  private readonly logger = new LightningLogger(LightningWalletService);

  private readonly client: LightningClient;

  constructor(
    lightningService: LightningService,
    private readonly lightningTransactionService: LightningTransactionService,
    private readonly userTransactionRepository: UserTransactionRepository,
    private readonly lightingWalletRepository: LightingWalletRepository,
    private readonly walletRepository: WalletRepository,
  ) {
    this.client = lightningService.getDefaultClient();
  }

  @Cron(CronExpression.EVERY_HOUR)
  @Lock()
  async processUpdateLightningWalletBalances(): Promise<void> {
    if (Config.processDisabled(Process.UPDATE_WALLET_BALANCE)) return;

    const lightningWalletIterator = this.lightingWalletRepository.getIterator(1000);
    let lightningWalletEntities = await lightningWalletIterator.next();

    while (lightningWalletEntities.length) {
      await this.doProcessUpdateLightningWalletBalances(lightningWalletEntities);
      lightningWalletEntities = await lightningWalletIterator.next();
    }
  }

  private async doProcessUpdateLightningWalletBalances(
    lightningWalletEntities: LightningWalletEntity[],
  ): Promise<void> {
    for (const lightningWalletEntity of lightningWalletEntities) {
      try {
        const lnbitsWallet = await this.client.getLnBitsWallet(lightningWalletEntity.adminKey);

        const lightningWalletEntityBalance = lightningWalletEntity.balance;
        const lnbitsWalletBalance = LightningHelper.btcToSat(lnbitsWallet.balance);

        if (lightningWalletEntityBalance !== lnbitsWalletBalance) {
          await this.lightingWalletRepository.update(lightningWalletEntity.id, {
            balance: lnbitsWalletBalance,
          });
        }
      } catch (e) {
        this.logger.error(
          `Error while updating wallet balance: ${lightningWalletEntity.id} / ${lightningWalletEntity.lnbitsWalletId}`,
          e,
        );
      }
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  @Lock()
  async processSyncRecentTransactions(): Promise<void> {
    if (Config.processDisabled(Process.UPDATE_LIGHTNING_USER_TRANSACTION)) return;

    await this.syncLightningUserTransactions(undefined, undefined, undefined, true);
  }

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  @Lock()
  async processSyncAllTransactions(): Promise<void> {
    if (Config.processDisabled(Process.SYNC_LIGHTNING_USER_TRANSACTIONS)) return;

    const startDate = new Date(0);
    const endDate = new Date('2099-12-31T23:59:59.999Z');
    const withBalance = false;

    const startTime = Date.now();
    const entities = await this.syncLightningUserTransactions(startDate, endDate, undefined, withBalance);
    const runTime = (Date.now() - startTime) / 1000;

    this.logger.info(`syncLightningUserTransactions: runtime=${runTime} sec., entries=${entities.length}`);
  }

  async syncLightningUserTransactions(
    startDate?: Date,
    endDate?: Date,
    address?: string,
    withBalance?: boolean,
  ): Promise<UserTransactionEntity[]> {
    const userTransactionEntities: UserTransactionEntity[] = [];

    if (address) {
      const walletEntity = await this.walletRepository.findOneBy({ address: address });
      if (!walletEntity) throw new NotFoundException(`${address}: Wallet not found`);

      const lightningWalletInfo = walletEntity.lightningWallets.map<LightningWalletInfoDto>((lw) => ({
        lnbitsWalletId: lw.lnbitsWalletId,
        adminKey: lw.adminKey,
      }));

      userTransactionEntities.push(
        ...(await this.getUserTransactionEntities(lightningWalletInfo, startDate, endDate, withBalance)),
      );
    } else {
      const lightningWalletIterator = this.lightingWalletRepository.getIterator(100, 'lnbitsWalletId, adminKey');
      let lightningWalletInfo = await lightningWalletIterator.nextForType<LightningWalletInfoDto>();

      while (lightningWalletInfo.length) {
        userTransactionEntities.push(
          ...(await this.getUserTransactionEntities(lightningWalletInfo, startDate, endDate, withBalance)),
        );

        lightningWalletInfo = await lightningWalletIterator.nextForType<LightningWalletInfoDto>();
      }
    }

    userTransactionEntities.sort(
      (t1, t2) => t1.creationTimestamp.getTime() - t2.creationTimestamp.getTime() || (t1.amount > t2.amount ? -1 : 1),
    );

    const savedUserTransactionEntities = (
      await Util.doInBatches(
        userTransactionEntities,
        async (batch: UserTransactionEntity[]) => Promise.all(batch.map((ref) => this.doUpdateUserTransaction(ref))),
        100,
      )
    ).flat();

    if (withBalance) {
      const uniqueLightningWalletEntityMap = new Map<string, LightningWalletEntity>(
        savedUserTransactionEntities.map((ut) => [ut.lightningWallet.lnbitsWalletId, ut.lightningWallet]),
      );

      await this.doProcessUpdateLightningWalletBalances([...uniqueLightningWalletEntityMap.values()]);
    }

    return savedUserTransactionEntities;
  }

  private async getUserTransactionEntities(
    lightningWalletInfo: LightningWalletInfoDto[],
    timeStart?: Date,
    timeEnd?: Date,
    withBalance?: boolean,
  ): Promise<UserTransactionEntity[]> {
    const userTransactionEntities: UserTransactionEntity[] = [];

    for (const lightningWallet of lightningWalletInfo) {
      const startDate =
        timeStart ??
        (await this.userTransactionRepository.getMaxCreationTimestamp(lightningWallet.lnbitsWalletId))
          ?.maxCreationTimestamp ??
        new Date(0);

      const endDate = timeEnd ?? new Date('2099-12-31T23:59:59.999');
      userTransactionEntities.push(
        ...(await this.createUserTransactionEntities(lightningWallet, startDate, endDate, withBalance)),
      );
    }

    return userTransactionEntities;
  }

  private async createUserTransactionEntities(
    lightningWalletInfo: LightningWalletInfoDto,
    startDate: Date,
    endDate: Date,
    withBalance = false,
  ): Promise<UserTransactionEntity[]> {
    const userTransactionEntities: UserTransactionEntity[] = [];

    const lightningWalletEntity = await this.lightingWalletRepository.getByWalletId(lightningWalletInfo.lnbitsWalletId);

    const allUserWalletTransactions = await this.client.getUserWalletTransactions(lightningWalletInfo.lnbitsWalletId);
    const updateUserWalletTransactions = allUserWalletTransactions.filter(
      (t) => t.time * 1000 >= startDate.getTime() && t.time * 1000 <= endDate.getTime(),
    );

    for (const updateUserWalletTransaction of updateUserWalletTransactions) {
      const lightningTransactionEntity = await this.lightningTransactionService.getLightningTransactionByTransaction(
        updateUserWalletTransaction.payment_hash,
      );

      const userTransactionEntity = this.userTransactionRepository.create({
        type: updateUserWalletTransaction.checking_id.startsWith('internal')
          ? UserTransactionType.INTERN
          : UserTransactionType.EXTERN,
        amount: LightningHelper.msatToSat(updateUserWalletTransaction.amount),
        fee: LightningHelper.msatToSat(updateUserWalletTransaction.fee),
        creationTimestamp: new Date(updateUserWalletTransaction.time * 1000),
        expiresTimestamp: new Date(updateUserWalletTransaction.expiry * 1000),
        tag: updateUserWalletTransaction.extra.tag,
        lightningWallet: lightningWalletEntity,
        lightningTransaction: lightningTransactionEntity,
      });

      userTransactionEntities.push(userTransactionEntity);
    }

    if (withBalance && userTransactionEntities.length > 0) {
      const lnbitsWallet = await this.client.getLnBitsWallet(lightningWalletInfo.adminKey);
      userTransactionEntities[userTransactionEntities.length - 1].balance = LightningHelper.btcToSat(
        lnbitsWallet.balance,
      );
    }

    return userTransactionEntities;
  }

  private async doUpdateUserTransaction(
    updateUserTransactionEntity: UserTransactionEntity,
  ): Promise<UserTransactionEntity> {
    let dbUserTransactionEntity = await this.userTransactionRepository.findOneBy({
      lightningWallet: { id: updateUserTransactionEntity.lightningWallet.id },
      lightningTransaction: { id: updateUserTransactionEntity.lightningTransaction.id },
    });

    if (!dbUserTransactionEntity) {
      dbUserTransactionEntity = updateUserTransactionEntity;
    } else {
      Object.assign(dbUserTransactionEntity, updateUserTransactionEntity);
    }

    return this.userTransactionRepository.save(dbUserTransactionEntity);
  }
}
