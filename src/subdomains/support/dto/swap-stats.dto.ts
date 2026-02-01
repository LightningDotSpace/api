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

  // Crypto details
  @ApiPropertyOptional({ description: 'Preimage hash (links swap across chains)' })
  preimageHash?: string;

  @ApiPropertyOptional({ description: 'Preimage (revealed after claim)' })
  preimage?: string;

  @ApiPropertyOptional({ description: 'Swap version' })
  version?: number;

  // Source chain details
  @ApiProperty()
  sourceSymbol: string;

  @ApiPropertyOptional({ description: 'Source chain ID (e.g., 137 for Polygon)' })
  sourceChainId?: number;

  @ApiPropertyOptional()
  sourceAddress?: string;

  @ApiPropertyOptional()
  sourceExpectedAmount?: string;

  @ApiPropertyOptional()
  sourceAmount?: string;

  @ApiPropertyOptional({ description: 'User lockup TX on source chain' })
  sourceTxId?: string;

  @ApiPropertyOptional({ description: 'Boltz claim TX on source chain (from ponder-claim)' })
  sourceClaimTxId?: string;

  // Destination chain details
  @ApiProperty()
  destSymbol: string;

  @ApiPropertyOptional({ description: 'Destination chain ID (e.g., 5115 for Citrea)' })
  destChainId?: number;

  @ApiPropertyOptional()
  destAddress?: string;

  @ApiPropertyOptional()
  destExpectedAmount?: string;

  @ApiPropertyOptional()
  destAmount?: string;

  @ApiPropertyOptional({ description: 'Boltz lockup TX on destination chain' })
  destTxId?: string;

  @ApiPropertyOptional({ description: 'User claim TX on destination chain (from ponder-claim)' })
  destClaimTxId?: string;
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
