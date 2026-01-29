import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum SwapType {
  CHAIN = 'chain',
  SUBMARINE = 'submarine',
  REVERSE = 'reverse',
}

export enum SwapStatusFilter {
  ALL = 'all',
  CLAIMED = 'claimed',
  EXPIRED = 'expired',
  REFUNDED = 'refunded',
  PENDING = 'pending',
  FAILED = 'failed',
}

export class SwapStatsQueryDto {
  @ApiPropertyOptional({ enum: SwapType })
  @IsOptional()
  @IsEnum(SwapType)
  type?: SwapType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pair?: string;

  @ApiPropertyOptional({ enum: SwapStatusFilter })
  @IsOptional()
  @IsEnum(SwapStatusFilter)
  status?: SwapStatusFilter;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  direction?: string;
}

export class SwapDto {
  @ApiProperty()
  type: string;

  @ApiProperty()
  id: string;

  @ApiProperty()
  pair: string;

  @ApiProperty()
  direction: string;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  failureReason?: string;

  @ApiProperty()
  fee: string;

  @ApiPropertyOptional()
  referral?: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  @ApiProperty()
  sourceSymbol: string;

  @ApiPropertyOptional()
  sourceAddress?: string;

  @ApiPropertyOptional()
  sourceExpectedAmount?: string;

  @ApiPropertyOptional()
  sourceAmount?: string;

  @ApiPropertyOptional()
  sourceTxId?: string;

  @ApiProperty()
  destSymbol: string;

  @ApiPropertyOptional()
  destAddress?: string;

  @ApiPropertyOptional()
  destExpectedAmount?: string;

  @ApiPropertyOptional()
  destAmount?: string;

  @ApiPropertyOptional()
  destTxId?: string;
}

export class SwapStatsResponseDto {
  @ApiProperty()
  total: number;

  @ApiProperty()
  claimed: number;

  @ApiProperty()
  expired: number;

  @ApiProperty()
  refunded: number;

  @ApiProperty()
  pending: number;

  @ApiProperty()
  failed: number;

  @ApiProperty({ type: [SwapDto] })
  swaps: SwapDto[];
}
