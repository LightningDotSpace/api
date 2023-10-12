import { TransactionLightningEntity } from '../entities/transaction-lightning.entity';
import { LightningTransactionDto } from './lightning-transaction.dts';

export class LightningTransactionDtoMapper {
  static entityToDto(transaction: TransactionLightningEntity): LightningTransactionDto {
    const dto: LightningTransactionDto = {
      type: transaction.type,
      state: transaction.state,
      transaction: transaction.transaction,
      secret: transaction.secret,
      publicKey: transaction.publicKey,
      amount: transaction.amount,
      fee: transaction.fee,
      creationTimestamp: transaction.creationTimestamp,
      expiresTimestamp: transaction.expiresTimestamp,
      confirmedTimestamp: transaction.confirmedTimestamp,
      description: transaction.description,
      reason: transaction.reason,
      paymentRequest: transaction.paymentRequest,
    };

    return Object.assign(new LightningTransactionDto(), dto);
  }

  static entitiesToDto(transactions: TransactionLightningEntity[]): LightningTransactionDto[] {
    return transactions.map((t) => LightningTransactionDtoMapper.entityToDto(t));
  }
}
