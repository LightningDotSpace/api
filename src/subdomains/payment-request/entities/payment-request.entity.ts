import { IEntity } from 'src/shared/db/entity';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { AssetAccountEntity } from 'src/subdomains/master-data/asset/entities/asset-account.entity';
import { AssetTransferEntity } from 'src/subdomains/master-data/asset/entities/asset-transfer.entity';
import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { LightningWalletEntity } from '../../user/domain/entities/lightning-wallet.entity';
import { UserTransactionEntity } from '../../user/domain/entities/user-transaction.entity';

export enum PaymentRequestState {
  PENDING = 'pending',
  EXPIRED = 'expired',
  DUPLICATE = 'duplicate',
  FAILED = 'failed',
  COMPLETED = 'completed',
}

@Entity('payment_request')
export class PaymentRequestEntity extends IEntity {
  @Column()
  state: PaymentRequestState;

  @ManyToOne(() => AssetAccountEntity, { eager: true })
  accountAsset: AssetAccountEntity;

  @Column({ type: 'float' })
  accountAmount: number;

  @ManyToOne(() => AssetTransferEntity, { eager: true })
  transferAsset: AssetTransferEntity;

  @Column({ type: 'float' })
  transferAmount: number;

  @Column({ length: 'MAX' })
  paymentRequest: string;

  @Column()
  expiryDate: Date;

  @Column()
  blockchain: Blockchain;

  @Column({ length: 'MAX', nullable: true })
  errorMessage?: string;

  @ManyToOne(() => LightningWalletEntity, { eager: true })
  lightningWallet: LightningWalletEntity;

  @OneToMany(() => UserTransactionEntity, (tx) => tx.lightningTransaction, { nullable: true, eager: true })
  userTransactions: UserTransactionEntity[];

  // --- ENTITY METHODS --- //

  complete(): this {
    this.state = PaymentRequestState.COMPLETED;

    return this;
  }

  fail(errorMessage: string): this {
    this.state = PaymentRequestState.FAILED;
    this.errorMessage = errorMessage;

    return this;
  }
}
