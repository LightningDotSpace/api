import { Injectable, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Config, Process } from 'src/config/config';
import { LnBitsPaymentWebhookDto } from 'src/integration/blockchain/lightning/dto/lnbits.dto';
import { LightningClient } from 'src/integration/blockchain/lightning/lightning-client';
import { LightningHelper } from 'src/integration/blockchain/lightning/lightning-helper';
import { LightningService } from 'src/integration/blockchain/lightning/services/lightning.service';
import { LnbitsWebHookService } from 'src/integration/blockchain/lightning/services/lnbits-webhook.service';
import { LightningLogger } from 'src/shared/services/lightning-logger';
import { Lock } from 'src/shared/utils/lock';
import { QueueHandler } from 'src/shared/utils/queue-handler';
import { Util } from 'src/shared/utils/util';
import { LightningTransactionService } from 'src/subdomains/lightning/services/lightning-transaction.service';
import { AssetService } from 'src/subdomains/master-data/asset/services/asset.service';
import { PaymentRequestMethod } from 'src/subdomains/payment-request/entities/payment-request.entity';
import { PaymentRequestService } from 'src/subdomains/payment-request/services/payment-request.service';
import { UserTransactionRepository } from 'src/subdomains/user/application/repositories/user-transaction.repository';
import {
  UserTransactionEntity,
  UserTransactionType,
} from 'src/subdomains/user/domain/entities/user-transaction.entity';
import { LightningWalletEntity } from '../../domain/entities/lightning-wallet.entity';
import { UserTransactionDto } from '../dto/user-transaction.dto';
import { LightingWalletRepository } from '../repositories/lightning-wallet.repository';
import { WalletRepository } from '../repositories/wallet.repository';

interface LightningWalletInfoDto {
  lightningWalletId: number;
  lnbitsWalletId: string;
  adminKey: string;
  accountAssetId: number;
}

@Injectable()
export class LightningWalletService {
  private readonly logger = new LightningLogger(LightningWalletService);

  private readonly client: LightningClient;

  private readonly paymentWebhookMessageQueue: QueueHandler;

  constructor(
    readonly lightningService: LightningService,
    readonly lnbitsWebHookService: LnbitsWebHookService,
    private readonly assetService: AssetService,
    private readonly lightningTransactionService: LightningTransactionService,
    private readonly paymentRequestService: PaymentRequestService,
    private readonly userTransactionRepository: UserTransactionRepository,
    private readonly lightingWalletRepository: LightingWalletRepository,
    private readonly walletRepository: WalletRepository,
  ) {
    this.client = lightningService.getDefaultClient();

    this.paymentWebhookMessageQueue = new QueueHandler();

    lnbitsWebHookService.getPaymentWebhookObservable().subscribe((dto) => this.processPaymentRequestMessageQueue(dto));
  }

  @Cron(CronExpression.EVERY_HOUR)
  @Lock()
  async processUpdateLightningWalletBalances(): Promise<void> {
    if (Config.processDisabled(Process.UPDATE_WALLET_BALANCE)) return;

    const lightningWalletIterator = this.lightingWalletRepository.getIterator(1000);
    let lightningWalletEntities = await lightningWalletIterator.next();

    while (lightningWalletEntities.length) {
      await this.doUpdateLightningWalletBalances(lightningWalletEntities);
      lightningWalletEntities = await lightningWalletIterator.next();
    }
  }

  async updateLightningWalletBalanceById(lightningWalletId: number) {
    const lightningWallet = await this.lightingWalletRepository.findOneBy({ id: lightningWalletId });

    if (lightningWallet) await this.doUpdateLightningWalletBalances([lightningWallet]);
  }

  private async doUpdateLightningWalletBalances(lightningWalletEntities: LightningWalletEntity[]): Promise<void> {
    const btcWalletEntities = lightningWalletEntities.filter(
      (a) => a.asset.name === AssetService.BTC_ACCOUNT_ASSET_NAME,
    );

    const fiatWalletEntities = lightningWalletEntities.filter(
      (a) => a.asset.name !== AssetService.BTC_ACCOUNT_ASSET_NAME,
    );

    await this.doUpdateBtcWalletBalances(btcWalletEntities);
    await this.doUpdateFiatWalletBalances(fiatWalletEntities);
  }

  private async doUpdateBtcWalletBalances(btcWalletEntities: LightningWalletEntity[]): Promise<void> {
    for (const btcWalletEntity of btcWalletEntities) {
      try {
        const lnbitsWallet = await this.client.getLnBitsWallet(btcWalletEntity.adminKey);

        const lightningWalletEntityBalance = btcWalletEntity.balance;
        const lnbitsWalletBalance = LightningHelper.btcToSat(lnbitsWallet.balance);

        if (lightningWalletEntityBalance !== lnbitsWalletBalance) {
          await this.lightingWalletRepository.update(btcWalletEntity.id, {
            balance: lnbitsWalletBalance,
          });
        }
      } catch (e) {
        this.logger.error(
          `Error while updating wallet balance: ${btcWalletEntity.id} / ${btcWalletEntity.lnbitsWalletId}`,
          e,
        );
      }
    }
  }

  private async doUpdateFiatWalletBalances(fiatWalletEntities: LightningWalletEntity[]): Promise<void> {
    for (const fiatWalletEntity of fiatWalletEntities) {
      try {
        const userTransactionEntities = await this.userTransactionRepository.getByLightningWalletId(
          fiatWalletEntity.id,
        );

        const fiatWalletEntityBalance = fiatWalletEntity.balance;
        const fiatWalletBalance = Util.sum(userTransactionEntities.map((t) => t.amount));

        if (fiatWalletEntityBalance !== fiatWalletBalance) {
          await this.lightingWalletRepository.update(fiatWalletEntity.id, {
            balance: fiatWalletBalance,
          });
        }
      } catch (e) {
        this.logger.error(
          `Error while updating wallet balance: ${fiatWalletEntity.id} / ${fiatWalletEntity.lnbitsWalletId}`,
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

    const startDate = Util.daysBefore(7);
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
        lightningWalletId: lw.id,
        lnbitsWalletId: lw.lnbitsWalletId,
        adminKey: lw.adminKey,
        accountAssetId: lw.asset.id,
      }));

      userTransactionEntities.push(
        ...(await this.getUserTransactionEntities(lightningWalletInfo, startDate, endDate, withBalance)),
      );
    } else {
      const lightningWalletIterator = this.lightingWalletRepository.getRawIterator<LightningWalletInfoDto>(
        100,
        'id AS lightningWalletId, lnbitsWalletId, adminKey, assetId AS accountAssetId',
      );
      let lightningWalletInfo = await lightningWalletIterator.next();

      while (lightningWalletInfo.length) {
        userTransactionEntities.push(
          ...(await this.getUserTransactionEntities(lightningWalletInfo, startDate, endDate, withBalance)),
        );

        lightningWalletInfo = await lightningWalletIterator.next();
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

      await this.doUpdateLightningWalletBalances([...uniqueLightningWalletEntityMap.values()]);
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
      const accountAsset = await this.assetService.getAccountAssetByIdOrThrow(lightningWallet.accountAssetId);

      if (accountAsset.name === AssetService.BTC_ACCOUNT_ASSET_NAME) {
        const startDate =
          timeStart ??
          (await this.userTransactionRepository.getMaxCreationTimestamp(lightningWallet.lnbitsWalletId))
            ?.maxCreationTimestamp ??
          new Date(0);

        const endDate = timeEnd ?? new Date('2099-12-31T23:59:59.999');

        userTransactionEntities.push(
          ...(await this.createLightningUserTransactionEntities(lightningWallet, startDate, endDate, withBalance)),
        );
      }

      if (accountAsset.name === AssetService.CHF_ACCOUNT_ASSET_NAME) {
        userTransactionEntities.push(...(await this.createEvmUserTransactionEntities(lightningWallet, withBalance)));
      }
    }

    return userTransactionEntities;
  }

  private async createLightningUserTransactionEntities(
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

      const userTransaction: UserTransactionDto = {
        type: updateUserWalletTransaction.checking_id.startsWith('internal')
          ? UserTransactionType.INTERN
          : UserTransactionType.EXTERN,
        amount: LightningHelper.msatToSat(updateUserWalletTransaction.amount),
        fee: LightningHelper.msatToSat(updateUserWalletTransaction.fee),
        creationTimestamp: new Date(updateUserWalletTransaction.time * 1000),
        expiresTimestamp: new Date(updateUserWalletTransaction.expiry * 1000),
        tag: updateUserWalletTransaction.extra.tag,
      };

      userTransactionEntities.push(
        UserTransactionEntity.createUserTransactionEntity(userTransaction, lightningWalletEntity, {
          lightningTransactionEntity,
        }),
      );
    }

    if (withBalance && userTransactionEntities.length > 0) {
      const lnbitsWallet = await this.client.getLnBitsWallet(lightningWalletInfo.adminKey);
      userTransactionEntities[userTransactionEntities.length - 1].balance = LightningHelper.btcToSat(
        lnbitsWallet.balance,
      );
    }

    return userTransactionEntities;
  }

  private async createEvmUserTransactionEntities(
    lightningWalletInfo: LightningWalletInfoDto,
    withBalance = false,
  ): Promise<UserTransactionEntity[]> {
    const userTransactionEntities = await this.userTransactionRepository.getByLightningWalletId(
      lightningWalletInfo.lightningWalletId,
    );

    if (withBalance && userTransactionEntities.length > 0) {
      userTransactionEntities[userTransactionEntities.length - 1].balance = Util.sum(
        userTransactionEntities.map((t) => t.amount),
      );
    }

    return userTransactionEntities;
  }

  private async doUpdateUserTransaction(
    updateUserTransactionEntity: UserTransactionEntity,
  ): Promise<UserTransactionEntity> {
    let dbUserTransactionEntity = await this.userTransactionRepository.findOneBy({
      lightningWallet: { id: updateUserTransactionEntity.lightningWallet.id },
      lightningTransaction: { id: updateUserTransactionEntity.lightningTransaction?.id },
    });

    if (!dbUserTransactionEntity) {
      dbUserTransactionEntity = updateUserTransactionEntity;
    } else {
      Object.assign(dbUserTransactionEntity, updateUserTransactionEntity);
    }

    return this.userTransactionRepository.save(dbUserTransactionEntity);
  }

  private processPaymentRequestMessageQueue(dto: LnBitsPaymentWebhookDto): void {
    this.paymentWebhookMessageQueue
      .handle<void>(async () => this.processPaymentRequest(dto))
      .catch((e) => {
        this.logger.error('Error while process new payment', e);
      });
  }

  private async processPaymentRequest(dto: LnBitsPaymentWebhookDto): Promise<void> {
    const amount = LightningHelper.msatToBtc(dto.amount);

    const paymentRequestEntity = await this.paymentRequestService.findPending(amount, PaymentRequestMethod.LIGHTNING);

    if (dto.bolt11 === paymentRequestEntity?.paymentRequest) {
      try {
        await this.doProcessPaymentRequest(dto);

        const transferAsset = await this.assetService.getSatTransferAssetOrThrow();
        await this.paymentRequestService.completePaymentRequest(paymentRequestEntity, transferAsset);
      } catch (e) {
        const errorMessage = `Process payment request with txid ${dto.payment_hash} failed for lightning wallet ${dto.wallet_id}`;
        this.logger.error(errorMessage, e);
        await this.paymentRequestService.failPaymentRequest(paymentRequestEntity, errorMessage);
      }
    }
  }

  private async doProcessPaymentRequest(dto: LnBitsPaymentWebhookDto): Promise<void> {
    const lightningWallet = await this.lightingWalletRepository.getByWalletId(dto.wallet_id);

    const lightningWalletInfo: LightningWalletInfoDto = {
      lightningWalletId: lightningWallet.id,
      lnbitsWalletId: lightningWallet.lnbitsWalletId,
      adminKey: lightningWallet.adminKey,
      accountAssetId: lightningWallet.asset.id,
    };

    const userTransactionEntities = await this.getUserTransactionEntities([lightningWalletInfo]);

    const savedUserTransactionEntities = (
      await Util.doInBatches(
        userTransactionEntities,
        async (batch: UserTransactionEntity[]) => Promise.all(batch.map((ref) => this.doUpdateUserTransaction(ref))),
        100,
      )
    ).flat();

    const uniqueLightningWalletEntityMap = new Map<string, LightningWalletEntity>(
      savedUserTransactionEntities.map((ut) => [ut.lightningWallet.lnbitsWalletId, ut.lightningWallet]),
    );

    await this.doUpdateLightningWalletBalances([...uniqueLightningWalletEntityMap.values()]);
  }
}
