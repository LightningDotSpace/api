import { IEntity } from 'src/shared/db/entity';
import { TransactionEvmEntity } from 'src/subdomains/evm/entities/transaction-evm.entity';
import { LightningWalletEntity } from 'src/subdomains/user/domain/entities/lightning-wallet.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { TransactionLightningEntity } from '../../../lightning/entities/transaction-lightning.entity';
import { PaymentRequestEntity } from '../../../payment-request/entities/payment-request.entity';
import { UserTransactionDto } from '../../application/dto/user-transaction.dto';

export enum UserTransactionType {
  INTERN = 'intern',
  EXTERN = 'extern',
}

@Entity('user_transaction')
export class UserTransactionEntity extends IEntity {
  @Column()
  type: UserTransactionType;

  @Column({ type: 'float' })
  amount: number;

  @Column({ type: 'float', default: 0 })
  fee: number;

  @Column({ type: 'float', nullable: true })
  balance: number;

  @Column({ type: 'datetime' })
  creationTimestamp: Date;

  @Column({ type: 'datetime', nullable: true })
  expiresTimestamp?: Date;

  @Column({ nullable: true })
  tag?: string;

  @ManyToOne(() => LightningWalletEntity, { eager: true })
  lightningWallet: LightningWalletEntity;

  @ManyToOne(() => TransactionLightningEntity, { nullable: true })
  lightningTransaction?: TransactionLightningEntity;

  @OneToOne(() => TransactionEvmEntity, { nullable: true })
  @JoinColumn()
  evmTransaction?: TransactionEvmEntity;

  @OneToOne(() => PaymentRequestEntity, { nullable: true })
  @JoinColumn()
  paymentRequest?: PaymentRequestEntity;

  // --- CREATE --- //
  static createUserTransactionEntity(
    userTransaction: UserTransactionDto,
    lightningWalletEntity: LightningWalletEntity,
    ref: {
      lightningTransactionEntity?: TransactionLightningEntity;
      evmTransactionEntity?: TransactionEvmEntity;
      paymentRequestEntity?: PaymentRequestEntity;
    },
  ): UserTransactionEntity {
    const newEntity = new UserTransactionEntity();

    newEntity.type = userTransaction.type;
    newEntity.amount = userTransaction.amount;
    newEntity.fee = userTransaction.fee;
    newEntity.creationTimestamp = userTransaction.creationTimestamp;
    newEntity.expiresTimestamp = userTransaction.expiresTimestamp;
    newEntity.tag = userTransaction.tag;
    newEntity.lightningWallet = lightningWalletEntity;
    newEntity.lightningTransaction = ref.lightningTransactionEntity;
    newEntity.evmTransaction = ref.evmTransactionEntity;
    newEntity.paymentRequest = ref.paymentRequestEntity;

    return newEntity;
  }
}
