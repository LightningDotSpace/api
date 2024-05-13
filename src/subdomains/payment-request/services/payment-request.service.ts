import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Config, Process } from 'src/config/config';
import { LightningLogger } from 'src/shared/services/lightning-logger';
import { Lock } from 'src/shared/utils/lock';
import { Util } from 'src/shared/utils/util';
import { LightingWalletPaymentParamDto } from 'src/subdomains/lightning/dto/lightning-wallet.dto';
import { AssetAccountEntity } from 'src/subdomains/master-data/asset/entities/asset-account.entity';
import { AssetTransferEntity } from 'src/subdomains/master-data/asset/entities/asset-transfer.entity';
import { AssetService } from 'src/subdomains/master-data/asset/services/asset.service';
import { LightningWalletEntity } from '../../user/domain/entities/lightning-wallet.entity';
import { PaymentRequestEntity, PaymentRequestMethod, PaymentRequestState } from '../entities/payment-request.entity';
import { PaymentRequestRepository } from '../repositories/payment-request.repository';

@Injectable()
export class PaymentRequestService {
  private readonly logger = new LightningLogger(PaymentRequestService);

  constructor(
    private readonly paymentRequestRepository: PaymentRequestRepository,
    private readonly assetService: AssetService,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  @Lock()
  async processOpenTransactions(): Promise<void> {
    if (Config.processDisabled(Process.UPDATE_PAYMENT_REQUEST)) return;

    const pendingPaymentRequestEntities = await this.paymentRequestRepository.findBy({
      state: PaymentRequestState.PENDING,
    });

    const currentDate = new Date();

    for (const pendingPaymentRequestEntity of pendingPaymentRequestEntities) {
      const secondsDiff = Util.secondsDiff(pendingPaymentRequestEntity.expiryDate, currentDate);
      const timeoutWithDelay = Config.payment.timeout + Config.payment.timeoutDelay;

      if (secondsDiff > timeoutWithDelay) {
        await this.expirePaymentRequest(pendingPaymentRequestEntity);
      }
    }
  }

  // --- FUNCTIONS --- //

  async getPaymentRequest(id: number): Promise<PaymentRequestEntity> {
    const paymentRequest = await this.paymentRequestRepository.findOneBy({ id });
    if (!paymentRequest) throw new NotFoundException(`Payment request with id ${id} not found`);

    return paymentRequest;
  }

  async findPending(
    transferAmount: number,
    paymentMethod: PaymentRequestMethod,
  ): Promise<PaymentRequestEntity | undefined> {
    const paymentRequests = await this.paymentRequestRepository.findPending(transferAmount, paymentMethod);
    if (!paymentRequests?.length) return;

    if (1 != paymentRequests.length) {
      for (const paymentRequest of paymentRequests) {
        const errorMessage = `Payment request id ${paymentRequest.id}: ${paymentRequests.length} pending payment request entries with amount ${transferAmount} found`;
        await this.failPaymentRequest(paymentRequest, errorMessage);
      }

      return;
    }

    return paymentRequests[0];
  }

  async checkDuplicate(walletPaymentParam: LightingWalletPaymentParamDto) {
    const accountAsset = await this.assetService.getAccountAssetByNameOrThrow(walletPaymentParam.currencyCode ?? '');

    const duplicates = await this.paymentRequestRepository.exist({
      where: {
        state: PaymentRequestState.PENDING,
        transferAmount: Number(walletPaymentParam.amount),
        invoiceAsset: { id: accountAsset.id },
      },
    });

    if (duplicates)
      throw new ServiceUnavailableException(
        `Duplicate currency ${walletPaymentParam.currencyCode} and amount ${walletPaymentParam.amount}`,
      );
  }

  async savePaymentRequest(
    invoiceAsset: AssetAccountEntity,
    invoiceAmount: number,
    transferAmount: number,
    paymentRequest: string,
    expiryDate: Date,
    paymentMethod: PaymentRequestMethod,
    lightningWallet: LightningWalletEntity,
  ): Promise<void> {
    try {
      const newPaymentRequestEntity = this.paymentRequestRepository.create({
        state: PaymentRequestState.PENDING,
        invoiceAsset,
        invoiceAmount,
        transferAmount,
        paymentRequest,
        expiryDate,
        paymentMethod,
        lightningWallet,
      });

      await this.paymentRequestRepository.save(newPaymentRequestEntity);
    } catch (e) {
      this.logger.error(`Save payment request failed for method ${paymentMethod}: ${paymentRequest}`, e);
    }
  }

  async completePaymentRequest(entity: PaymentRequestEntity, asset: AssetTransferEntity): Promise<void> {
    await this.paymentRequestRepository.save(entity.complete(asset));
  }

  async expirePaymentRequest(entity: PaymentRequestEntity): Promise<void> {
    await this.paymentRequestRepository.save(entity.expire());
  }

  async failPaymentRequest(entity: PaymentRequestEntity, errorMessage: string): Promise<void> {
    this.logger.error(errorMessage);
    await this.paymentRequestRepository.save(entity.fail(errorMessage));
  }
}
