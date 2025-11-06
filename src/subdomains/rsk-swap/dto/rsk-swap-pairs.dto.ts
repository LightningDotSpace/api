import { ApiProperty } from '@nestjs/swagger';

export class SwapLimitsDto {
  @ApiProperty({ description: 'Minimum swap amount in satoshis', example: 2500 })
  minimal: number;

  @ApiProperty({ description: 'Maximum swap amount in satoshis', example: 10000000 })
  maximal: number;

  @ApiProperty({ description: 'Maximal zero-conf amount', example: 1000000, required: false })
  maximalZeroConf?: number;
}

export class SwapFeesDto {
  @ApiProperty({ description: 'Fee percentage', example: 0.25 })
  percentage: number;

  @ApiProperty({
    description: 'Miner fees',
    example: { claim: 64, lockup: 121 },
  })
  minerFees: {
    claim: number;
    lockup: number;
  };
}

export class SwapPairInfoDto {
  @ApiProperty({ description: 'Swap configuration hash', example: 'abc123...' })
  hash: string;

  @ApiProperty({ description: 'Exchange rate', example: 1 })
  rate: number;

  @ApiProperty({ description: 'Swap limits', type: SwapLimitsDto })
  limits: SwapLimitsDto;

  @ApiProperty({ description: 'Swap fees', type: SwapFeesDto })
  fees: SwapFeesDto;
}

// Using Record type instead of index signature for Swagger compatibility
export type SwapPairsResponseDto = Record<string, Record<string, SwapPairInfoDto>>;
