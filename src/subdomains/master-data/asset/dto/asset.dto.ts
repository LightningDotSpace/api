import { ApiProperty } from '@nestjs/swagger';
import { AssetStatus } from '../entities/asset.entity';

export class AssetDto {
  @ApiProperty({
    description: 'Asset name',
  })
  name: string;

  @ApiProperty({
    description: 'Asset display name',
  })
  displayName: string;

  @ApiProperty({
    description: 'Asset description',
  })
  description?: string;

  @ApiProperty({
    description: 'Asset status',
    enum: AssetStatus,
  })
  status: AssetStatus;
}
