import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionLightningState, TransactionLightningType } from '../entities/transaction-lightning.entity';

export class LightningTransactionDto {
  @ApiProperty({ enum: TransactionLightningType })
  type: TransactionLightningType;

  @ApiProperty({ enum: TransactionLightningState })
  state: TransactionLightningState;

  @ApiProperty()
  transaction: string;

  @ApiProperty()
  secret: string;

  @ApiPropertyOptional()
  publicKey?: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  fee: number;

  @ApiProperty()
  creationTimestamp: Date;

  @ApiPropertyOptional()
  expiresTimestamp?: Date;

  @ApiPropertyOptional()
  confirmedTimestamp?: Date;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  reason?: string;

  @ApiPropertyOptional()
  paymentRequest?: string;
}
