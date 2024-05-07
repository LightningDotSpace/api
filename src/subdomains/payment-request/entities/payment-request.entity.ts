import { IEntity } from 'src/shared/db/entity';
import { AssetAccountEntity } from 'src/subdomains/master-data/asset/entities/asset-account.entity';
import { AssetTransferEntity } from 'src/subdomains/master-data/asset/entities/asset-transfer.entity';
import { UserTransactionEntity } from 'src/subdomains/user/domain/entities/user-transaction.entity';
import { Column, Entity, ManyToOne, OneToOne } from 'typeorm';
import { LightningWalletEntity } from '../../user/domain/entities/lightning-wallet.entity';

export enum PaymentRequestState {
  PENDING = 'pending',
  EXPIRED = 'expired',
  DUPLICATE = 'duplicate',
  FAILED = 'failed',
  COMPLETED = 'completed',
}

export enum PaymentRequestMethod {
  LIGHTNING = 'lightning',
  EVM = 'evm',
}

@Entity('payment_request')
export class PaymentRequestEntity extends IEntity {
  @Column()
  state: PaymentRequestState;

  @ManyToOne(() => AssetAccountEntity, { eager: true })
  accountAsset: AssetAccountEntity;

  @Column({ type: 'float' })
  accountAmount: number;

  @ManyToOne(() => AssetTransferEntity, { eager: true, nullable: true })
  transferAsset?: AssetTransferEntity;

  @Column({ type: 'float' })
  transferAmount: number;

  @Column({ length: 'MAX' })
  paymentRequest: string;

  @Column()
  expiryDate: Date;

  @Column()
  paymentMethod: PaymentRequestMethod;

  @Column({ length: 'MAX', nullable: true })
  errorMessage?: string;

  @ManyToOne(() => LightningWalletEntity, { eager: true })
  lightningWallet: LightningWalletEntity;

  @OneToOne(() => UserTransactionEntity, (tx) => tx.paymentRequest, { nullable: true, eager: true })
  userTransactions?: UserTransactionEntity[];

  // --- ENTITY METHODS --- //

  complete(): this {
    this.state = PaymentRequestState.COMPLETED;

    return this;
  }

  expire(): this {
    this.state = PaymentRequestState.EXPIRED;

    return this;
  }

  fail(errorMessage: string): this {
    this.state = PaymentRequestState.FAILED;
    this.errorMessage = errorMessage;

    return this;
  }
}
