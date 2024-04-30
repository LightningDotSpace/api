import { Injectable, ServiceUnavailableException } from '@nestjs/common';
//import { Cron, CronExpression } from '@nestjs/schedule';
//import { Config, Process } from 'src/config/config';
//import { Lock } from 'src/shared/utils/lock';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { LightningLogger } from 'src/shared/services/lightning-logger';
import { Util } from 'src/shared/utils/util';
import { LightingWalletPaymentParamDto } from 'src/subdomains/lightning/dto/lightning-wallet.dto';
import { AssetService } from 'src/subdomains/master-data/asset/services/asset.service';
import { LightningWalletEntity } from '../../user/domain/entities/lightning-wallet.entity';
import { PaymentRequestEntity, PaymentRequestState } from '../entities/payment-request.entity';
import { PaymentRequestRepository } from '../repositories/payment-request.repository';

@Injectable()
export class PaymentRequestService {
  private readonly logger = new LightningLogger(PaymentRequestService);

  static readonly MAX_TIMEOUT_SECONDS = 70;

  constructor(
    private readonly paymentRequestRepository: PaymentRequestRepository,
    private readonly assetService: AssetService,
  ) {}

  //@Cron(CronExpression.EVERY_10_SECONDS)
  //@Lock()
  async processOpenTransactions(): Promise<void> {
    //if (Config.processDisabled(Process.UPDATE_CURRENCY_TRANSACTION)) return;

    const createdCurrencyTransactionEntities = await this.paymentRequestRepository.findBy({
      state: PaymentRequestState.PENDING,
    });

    for (const createdCurrencyTransactionEntity of createdCurrencyTransactionEntities) {
      const currentDate = new Date();
      const currentUtcTime = currentDate.getTime() + currentDate.getTimezoneOffset() * 60 * 1000;

      const createdUtcTime = createdCurrencyTransactionEntity.created.getTime();

      const secondsDiff = (currentUtcTime - createdUtcTime) / 1000;

      if (secondsDiff > PaymentRequestService.MAX_TIMEOUT_SECONDS) {
        createdCurrencyTransactionEntity.state = PaymentRequestState.EXPIRED;
        await this.paymentRequestRepository.save(createdCurrencyTransactionEntity);
      }
    }
  }

  // --- FUNCTIONS --- //

  async findPendingByAmount(amount: number): Promise<PaymentRequestEntity | undefined> {
    const paymentRequests = await this.paymentRequestRepository.findPendingByAmount(amount);
    if (!paymentRequests?.length) return;

    if (1 != paymentRequests.length) {
      for (const paymentRequest of paymentRequests) {
        const errorMessage = `Payment request id ${paymentRequest.id}: ${paymentRequests.length} pending payment request entries with amount ${amount} found`;
        await this.failPaymentRequest(paymentRequest, errorMessage);
      }

      return;
    }

    return paymentRequests[0];
  }

  async checkDuplicate(walletPaymentParam: LightingWalletPaymentParamDto) {
    const duplicates = await this.paymentRequestRepository
      .createQueryBuilder()
      .where('state = :state)', { state: PaymentRequestState.PENDING })
      .andWhere('currency = :currency', { currency: walletPaymentParam.currencyCode })
      .andWhere('amount = :amount', { amount: Number(walletPaymentParam.amount) })
      .getExists();

    if (duplicates)
      throw new ServiceUnavailableException(
        `Duplicate currency ${walletPaymentParam.currencyCode} and amount ${walletPaymentParam.amount}`,
      );
  }

  async savePaymentRequest(
    accountAmount: number,
    transferAmount: number,
    paymentRequest: string,
    blockchain: Blockchain,
    lightningWallet: LightningWalletEntity,
  ): Promise<void> {
    try {
      const accountAsset = await this.assetService.getBtcAccountAssetOrThrow();

      const transferAsset =
        blockchain === Blockchain.LIGHTNING
          ? await this.assetService.getSatTransferAssetOrThrow()
          : await this.assetService.getZchfTransferAssetOrThrow(blockchain);

      const newPaymentRequestEntity = this.paymentRequestRepository.create({
        state: PaymentRequestState.PENDING,
        accountAmount,
        accountAsset: accountAsset,
        transferAmount,
        transferAsset: transferAsset,
        paymentRequest,
        expiryDate: Util.secondsAfter(70),
        blockchain,
        lightningWallet,
      });

      await this.paymentRequestRepository.save(newPaymentRequestEntity);
    } catch (e) {
      this.logger.error(`Save payment request failed for blockchain ${blockchain}: ${paymentRequest}`, e);
    }
  }

  async completePaymentRequest(entity: PaymentRequestEntity): Promise<void> {
    await this.paymentRequestRepository.save(entity.complete());
  }

  async failPaymentRequest(entity: PaymentRequestEntity, errorMessage: string): Promise<void> {
    this.logger.error(errorMessage);
    await this.paymentRequestRepository.save(entity.fail(errorMessage));
  }
}
