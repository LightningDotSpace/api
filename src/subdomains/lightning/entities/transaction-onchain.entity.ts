import { IEntity } from 'src/shared/db/entity';
import { Column, Entity } from 'typeorm';

@Entity('transaction_onchain')
export class TransactionOnchainEntity extends IEntity {
  @Column({ unique: true })
  transaction: string;

  @Column({ type: 'float' })
  amount: number;

  @Column({ type: 'float', default: 0 })
  fee: number;

  @Column({ type: 'float', nullable: true })
  balance?: number;

  @Column({ type: 'int' })
  block: number;

  @Column({ type: 'datetime' })
  timestamp: Date;
}
