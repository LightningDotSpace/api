import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional } from 'class-validator';

export class LightningOnchainTransactionQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  startBlock?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  endBlock?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  withBalance?: boolean;
}
