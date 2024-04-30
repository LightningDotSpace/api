import { IEntity } from 'src/shared/db/entity';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { AssetTransferEntity } from 'src/subdomains/master-data/asset/entities/asset-transfer.entity';
import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { UserTransactionEntity } from '../../user/domain/entities/user-transaction.entity';

export enum TransactionEvmState {
  PENDING = 'pending',
  FAILED = 'failed',
  COMPLETED = 'completed',
}

@Entity('transaction_evm')
export class TransactionEvmEntity extends IEntity {
  @Column()
  state: TransactionEvmState;

  @ManyToOne(() => AssetTransferEntity, { eager: true })
  asset: AssetTransferEntity;

  @Column({ type: 'float' })
  amount: number;

  @Column()
  transaction: string;

  @Column()
  blockchain: Blockchain;

  @Column({ length: 'MAX', nullable: true })
  errorMessage?: string;

  @OneToMany(() => UserTransactionEntity, (tx) => tx.lightningTransaction, { nullable: true, eager: true })
  userTransactions: UserTransactionEntity[];

  // --- ENTITY METHODS --- //

  complete(): this {
    this.state = TransactionEvmState.COMPLETED;

    return this;
  }

  fail(errorMessage: string): this {
    this.state = TransactionEvmState.FAILED;
    this.errorMessage = errorMessage;

    return this;
  }
}
