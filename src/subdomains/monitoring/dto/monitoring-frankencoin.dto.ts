import { ApiProperty } from '@nestjs/swagger';

export class MonitoringFrankencoinDto {
  @ApiProperty({
    description: 'Total Value Locked (ZCHF)',
  })
  totalValueLocked: number;

  @ApiProperty({
    description: 'Total Supply (ZCHF)',
  })
  zchfTotalSupply: number;

  @ApiProperty({
    description: 'Market Cap (FPS)',
  })
  fpsMarketCap: number;
}
