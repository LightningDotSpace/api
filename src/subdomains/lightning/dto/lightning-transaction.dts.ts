import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum } from 'class-validator';
import { TransactionLightningState, TransactionLightningType } from '../entities/transaction-lightning.entity';

export class LightningTransactionDto {
  @ApiProperty({ enum: TransactionLightningType })
  @IsEnum(TransactionLightningType)
  type: TransactionLightningType;

  @ApiProperty({ enum: TransactionLightningState })
  @IsEnum(TransactionLightningState)
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
  @IsDate()
  @Type(() => Date)
  creationTimestamp: Date;

  @ApiPropertyOptional()
  @IsDate()
  @Type(() => Date)
  expiresTimestamp?: Date;

  @ApiPropertyOptional()
  @IsDate()
  @Type(() => Date)
  confirmedTimestamp?: Date;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  reason?: string;

  @ApiPropertyOptional()
  paymentRequest?: string;
}
