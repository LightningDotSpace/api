import { Injectable } from '@nestjs/common';
import { LightningLogger } from 'src/shared/services/lightning-logger';
import { TransactionEvmEntity } from 'src/subdomains/evm/entities/transaction-evm.entity';
import { PaymentRequestEntity } from 'src/subdomains/payment-request/entities/payment-request.entity';
import { UserTransactionEntity, UserTransactionType } from '../../domain/entities/user-transaction.entity';
import { UserTransactionDto } from '../dto/user-transaction.dto';
import { UserTransactionRepository } from '../repositories/user-transaction.repository';

@Injectable()
export class UserTransactionService {
  private readonly logger = new LightningLogger(UserTransactionService);

  constructor(private readonly userTransactionRepository: UserTransactionRepository) {}

  async saveUserTransactionEvmRelated(
    evmTransactionEntity: TransactionEvmEntity,
    paymentRequestEntity: PaymentRequestEntity,
  ): Promise<UserTransactionEntity | undefined> {
    try {
      const userTransaction: UserTransactionDto = {
        type: UserTransactionType.EXTERN,
        amount: evmTransactionEntity.amount,
        fee: 0,
        creationTimestamp: paymentRequestEntity.created,
        expiresTimestamp: paymentRequestEntity.expiryDate,
      };

      const userTransactionEntity = UserTransactionEntity.createUserTransactionEntity(
        userTransaction,
        paymentRequestEntity.lightningWallet,
        {
          evmTransactionEntity,
          paymentRequestEntity,
        },
      );

      return await this.userTransactionRepository.save(userTransactionEntity);
    } catch (e) {
      this.logger.error(`Transaction EVM id ${evmTransactionEntity.id}: Save EVM related user transaction failed`, e);
    }
  }
}
