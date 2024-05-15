import { ApiProperty } from '@nestjs/swagger';
import { AssetAccountStatus } from '../entities/asset-account.entity';

export class AssetAccountDto {
  @ApiProperty({
    description: 'Asset name',
  })
  name: string;

  @ApiProperty({
    description: 'Asset display name',
  })
  displayName: string;

  @ApiProperty({
    description: 'Asset status',
    enum: AssetAccountStatus,
  })
  status: AssetAccountStatus;

  @ApiProperty({
    description: 'Asset symbol',
  })
  symbol: string;

  @ApiProperty({
    description: 'Asset min. sendable',
  })
  minSendable: number;

  @ApiProperty({
    description: 'Asset max. sendable',
  })
  maxSendable: number;

  @ApiProperty({
    description: 'Asset decimals',
  })
  decimals: number;
}
