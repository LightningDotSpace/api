import { UserTransactionType } from '../../domain/entities/user-transaction.entity';

export interface UserTransactionDto {
  type: UserTransactionType;
  amount: number;
  fee: number;
  creationTimestamp: Date;
  expiresTimestamp: Date;
  tag?: string;
}
