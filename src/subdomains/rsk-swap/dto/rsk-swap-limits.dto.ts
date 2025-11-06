import { ApiProperty } from '@nestjs/swagger';

export class RskSwapLimitsDto {
  @ApiProperty({
    description: 'Minimum swap amount in satoshis',
    example: 10000,
  })
  minimal: number;

  @ApiProperty({
    description: 'Maximum swap amount in satoshis',
    example: 10000000,
  })
  maximal: number;

  @ApiProperty({
    description: 'Maximal amount for zero-conf swaps in satoshis',
    example: 1000000,
    required: false,
  })
  maximalZeroConf?: number;
}
