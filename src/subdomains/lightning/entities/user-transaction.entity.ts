import { IEntity } from 'src/shared/db/entity';
import { LightningWalletEntity } from 'src/subdomains/user/domain/entities/lightning-wallet.entity';
import { Column, Entity, ManyToOne } from 'typeorm';
import { TransactionLightningEntity } from './transaction-lightning.entity';

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

  @Column({ type: 'datetime2' })
  creationTimestamp: Date;

  @Column({ type: 'datetime2', nullable: true })
  expiresTimestamp?: Date;

  @Column({ nullable: true })
  tag?: string;

  @ManyToOne(() => LightningWalletEntity, { eager: true })
  lightningWallet: LightningWalletEntity;

  @ManyToOne(() => TransactionLightningEntity, { nullable: false })
  lightningTransaction: TransactionLightningEntity;
}
