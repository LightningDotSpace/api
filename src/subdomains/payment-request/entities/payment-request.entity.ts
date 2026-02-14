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
  invoiceAsset: AssetAccountEntity;

  @Column({ type: 'float' })
  invoiceAmount: number;

  @ManyToOne(() => AssetTransferEntity, { eager: true, nullable: true })
  transferAsset?: AssetTransferEntity;

  @Column({ type: 'float' })
  transferAmount: number;

  @Column({ type: 'text' })
  paymentRequest: string;

  @Column({ type: 'datetime' })
  expiryDate: Date;

  @Column()
  paymentMethod: PaymentRequestMethod;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @ManyToOne(() => LightningWalletEntity, { eager: true })
  lightningWallet: LightningWalletEntity;

  @OneToOne(() => UserTransactionEntity, (tx) => tx.paymentRequest, { nullable: true, eager: true })
  userTransaction?: UserTransactionEntity;

  // --- ENTITY METHODS --- //

  complete(asset: AssetTransferEntity): this {
    this.transferAsset = asset;
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
