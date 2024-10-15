import { Injectable, NotFoundException } from '@nestjs/common';
import { Config } from 'src/config/config';
import {
  LnBitsTransactionDto,
  LnBitsTransactionExtraDto,
  LnBitsTransactionWebhookTransferDto,
  isLnBitsTransactionExtraTag,
} from 'src/integration/blockchain/lightning/dto/lnbits.dto';
import { LightningClient } from 'src/integration/blockchain/lightning/lightning-client';
import { LightningHelper } from 'src/integration/blockchain/lightning/lightning-helper';
import { LightningService } from 'src/integration/blockchain/lightning/services/lightning.service';
import { LnbitsWebHookService } from 'src/integration/blockchain/lightning/services/lnbits-webhook.service';
import { LightningLogger } from 'src/shared/services/lightning-logger';
import { QueueHandler } from 'src/shared/utils/queue-handler';
import { Util } from 'src/shared/utils/util';
import { LightningTransactionService } from 'src/subdomains/lightning/services/lightning-transaction.service';
import { AssetService } from 'src/subdomains/master-data/asset/services/asset.service';
import { MonitoringService } from 'src/subdomains/monitoring/services/monitoring.service';
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
    private readonly monitoringService: MonitoringService,
    private readonly assetService: AssetService,
    private readonly lightningTransactionService: LightningTransactionService,
    private readonly paymentRequestService: PaymentRequestService,
    private readonly userTransactionRepository: UserTransactionRepository,
    private readonly lightingWalletRepository: LightingWalletRepository,
    private readonly walletRepository: WalletRepository,
  ) {
    this.client = lightningService.getDefaultClient();

    this.paymentWebhookMessageQueue = new QueueHandler();

    lnbitsWebHookService
      .getTransactionWebhookObservable()
      .subscribe((webhookTransfer) => this.processTransactionRequestMessageQueue(webhookTransfer));
  }

  async getLightningWallet(walletId: string): Promise<LightningWalletEntity> {
    return this.lightingWalletRepository.getByWalletId(walletId);
  }

  async updateLightningWalletBalances(): Promise<void> {
    const userTransactionBalances = await this.userTransactionRepository.getBalances();

    for (const userTransactionBalance of userTransactionBalances) {
      await this.lightingWalletRepository.update(
        { id: userTransactionBalance.lightningWalletId },
        {
          balance: userTransactionBalance.balance,
        },
      );
    }

    const customerBalances = await this.lightingWalletRepository.getCustomerBalances(
      Config.monitoring.excludeLnbitsWalletIds,
    );
    await this.monitoringService.processBalanceMonitoring(customerBalances);
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
      await this.updateLightningWalletBalances();
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
    const lightningWalletEntity = await this.getLightningWallet(lightningWalletInfo.lnbitsWalletId);

    const allUserWalletTransactions = await this.client.getUserWalletTransactions(lightningWalletInfo.lnbitsWalletId);
    const updateUserWalletTransactions = allUserWalletTransactions.filter(
      (t) => t.time * 1000 >= startDate.getTime() && t.time * 1000 <= endDate.getTime(),
    );

    return this.doCreateLightningUserTransactionEntities(
      lightningWalletEntity,
      updateUserWalletTransactions,
      withBalance,
    );
  }

  private async doCreateLightningUserTransactionEntities(
    lightningWalletEntity: LightningWalletEntity,
    userTransactions: LnBitsTransactionDto[],
    withBalance = false,
  ) {
    const userTransactionEntities: UserTransactionEntity[] = [];

    for (const updateUserWalletTransaction of userTransactions) {
      const lightningTransactionEntity = await this.lightningTransactionService.getLightningTransactionByTransaction(
        updateUserWalletTransaction.payment_hash,
      );

      const tagOrFiat = this.getExtraTagOrFiat(updateUserWalletTransaction.extra);

      const userTransaction: UserTransactionDto = {
        type: updateUserWalletTransaction.checking_id.startsWith('internal')
          ? UserTransactionType.INTERN
          : UserTransactionType.EXTERN,
        amount: LightningHelper.msatToSat(updateUserWalletTransaction.amount),
        fee: LightningHelper.msatToSat(updateUserWalletTransaction.fee),
        creationTimestamp: new Date(updateUserWalletTransaction.time * 1000),
        expiresTimestamp: new Date(updateUserWalletTransaction.expiry * 1000),
        tag: tagOrFiat,
      };

      userTransactionEntities.push(
        UserTransactionEntity.createUserTransactionEntity(userTransaction, lightningWalletEntity, {
          lightningTransactionEntity,
        }),
      );
    }

    if (withBalance && userTransactionEntities.length > 0) {
      const lnbitsWallet = await this.client.getLnBitsWallet(lightningWalletEntity.adminKey);
      userTransactionEntities[userTransactionEntities.length - 1].balance = LightningHelper.btcToSat(
        lnbitsWallet.balance,
      );
    }

    return userTransactionEntities;
  }

  private getExtraTagOrFiat(extra?: LnBitsTransactionExtraDto): string | undefined {
    if (!extra) return;

    return isLnBitsTransactionExtraTag(extra) ? extra.tag : extra.fiat_currency;
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
      type: updateUserTransactionEntity.type,
    });

    if (!dbUserTransactionEntity) {
      dbUserTransactionEntity = updateUserTransactionEntity;
    } else {
      Object.assign(dbUserTransactionEntity, updateUserTransactionEntity);
    }

    return this.userTransactionRepository.save(dbUserTransactionEntity);
  }

  private processTransactionRequestMessageQueue(webhookTransfer: LnBitsTransactionWebhookTransferDto): void {
    this.paymentWebhookMessageQueue
      .handle<void>(async () => this.processTransactionRequest(webhookTransfer))
      .catch((e) => {
        this.logger.error('Error while processing transaction webhook data', e);
      });
  }

  private async processTransactionRequest(webhookTransfer: LnBitsTransactionWebhookTransferDto): Promise<void> {
    const transactions = webhookTransfer.changed;

    for (const transaction of transactions) {
      await this.doProcessTransaction(transaction);
      await this.doProcessPayment(transaction);
    }

    await this.updateLightningWalletBalances();
  }

  private async doProcessTransaction(transaction: LnBitsTransactionDto): Promise<void> {
    const lightningWalletEntity = await this.getLightningWallet(transaction.wallet_id);

    const userTransactionEntities = await this.doCreateLightningUserTransactionEntities(
      lightningWalletEntity,
      [transaction],
      true,
    );

    for (const userTransactionEntity of userTransactionEntities) {
      await this.doUpdateUserTransaction(userTransactionEntity);
    }
  }

  private async doProcessPayment(transaction: LnBitsTransactionDto): Promise<void> {
    const amount = LightningHelper.msatToBtc(transaction.amount);

    const paymentRequestEntity = await this.paymentRequestService.findPending(amount, PaymentRequestMethod.LIGHTNING);

    if (transaction.bolt11 === paymentRequestEntity?.paymentRequest) {
      try {
        const transferAsset = await this.assetService.getSatTransferAssetOrThrow();
        await this.paymentRequestService.completePaymentRequest(paymentRequestEntity, transferAsset);
      } catch (e) {
        const errorMessage = `Process payment request with txid ${transaction.payment_hash} failed for lightning wallet ${transaction.wallet_id}`;
        this.logger.error(errorMessage, e);
        await this.paymentRequestService.failPaymentRequest(paymentRequestEntity, errorMessage);
      }
    }
  }
}
