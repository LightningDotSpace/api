import { Injectable } from '@nestjs/common';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { LightningLogger } from 'src/shared/services/lightning-logger';
import { AlchemyWebhookActivityDto } from 'src/subdomains/alchemy/dto/alchemy-webhook.dto';
import { AssetTransferEntity } from 'src/subdomains/master-data/asset/entities/asset-transfer.entity';
import { PaymentRequestService } from 'src/subdomains/payment-request/services/payment-request.service';
import { UserTransactionService } from 'src/subdomains/user/application/services/user-transaction.service';
import { TransactionEvmEntity, TransactionEvmState } from '../../entities/transaction-evm.entity';
import { EvmUtil } from '../../evm.util';
import { TransactionEvmRepository } from '../../repositories/transaction-evm.repository';

@Injectable()
export class TransactionEvmService {
  private readonly logger = new LightningLogger(TransactionEvmService);

  constructor(
    private readonly transactionEvmRepo: TransactionEvmRepository,
    private readonly paymentRequestService: PaymentRequestService,
    private readonly userTransactionService: UserTransactionService,
  ) {}

  async saveTransaction(
    transaction: AlchemyWebhookActivityDto,
    blockchain: Blockchain,
    zchfAsset: AssetTransferEntity,
  ): Promise<void> {
    try {
      const newTransactionEvmEntity = this.transactionEvmRepo.create({
        state: TransactionEvmState.PENDING,
        asset: zchfAsset,
        amount: EvmUtil.fromWeiAmount(transaction.rawContract.rawValue, transaction.rawContract.decimals),
        transaction: transaction.hash,
      });

      const transactionEvmEntity = await this.transactionEvmRepo.save(newTransactionEvmEntity);

      await this.syncUserPayment(transactionEvmEntity, transaction.hash, blockchain);
    } catch (e) {
      this.logger.error(`Save transaction ${transaction.hash} failed for blockchain ${blockchain}`, e);
    }
  }

  async syncUserPayment(transactionEvmEntity: TransactionEvmEntity, txId: string, blockchain: Blockchain) {
    try {
      const paymentRequestEntity = await this.paymentRequestService.findPendingByAccountAmount(
        transactionEvmEntity.amount,
      );

      if (!paymentRequestEntity) {
        const errorMessage = `No pending payment request found for blockchain ${blockchain} with amount ${transactionEvmEntity.amount}`;
        await this.failTransactionEvm(transactionEvmEntity, errorMessage);

        return;
      }

      paymentRequestEntity.transferAsset = transactionEvmEntity.asset;

      const userTransactionEntity = await this.userTransactionService.saveUserTransactionEvmRelated(
        paymentRequestEntity,
        transactionEvmEntity,
      );

      if (!userTransactionEntity) {
        const errorMessage = `EVM transaction ${txId}: Save user transaction failed for blockchain ${blockchain}`;
        await this.paymentRequestService.failPaymentRequest(paymentRequestEntity, errorMessage);
        await this.failTransactionEvm(transactionEvmEntity, errorMessage);

        return;
      }

      await this.paymentRequestService.completePaymentRequest(paymentRequestEntity);
      await this.completeTransactionEvm(transactionEvmEntity);
    } catch (e) {
      this.logger.error(
        `Sync user payment failed for transaction ${txId} on blockchain ${blockchain} with amount ${transactionEvmEntity.amount}`,
        e,
      );
    }
  }

  async completeTransactionEvm(entity: TransactionEvmEntity): Promise<void> {
    await this.transactionEvmRepo.save(entity.complete());
  }

  async failTransactionEvm(entity: TransactionEvmEntity, errorMessage: string): Promise<void> {
    this.logger.error(errorMessage);
    await this.transactionEvmRepo.save(entity.fail(errorMessage));
  }
}
