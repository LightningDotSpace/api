import { ApiProperty } from '@nestjs/swagger';
import { AssetStatus } from '../../domain/entities/asset.entity';

export class LnAssetDto {
  @ApiProperty({
    description: 'Lightning asset name',
  })
  name: string;

  @ApiProperty({
    description: 'Lightning asset display name',
  })
  displayName: string;

  @ApiProperty({
    description: 'Lightning asset description',
  })
  description: string;

  @ApiProperty({
    description: 'Lightning asset status',
  })
  status: AssetStatus;
}

export class LnWalletDto {
  @ApiProperty({
    description: 'Lightning wallet asset',
  })
  asset: LnAssetDto;

  @ApiProperty({
    description: 'Lightning LndHUB admin URL',
  })
  lndhubAdminUrl: string;

  @ApiProperty({
    description: 'Lightning LndHUB invoice URL',
  })
  lndhubInvoiceUrl: string;
}

export class LnInfoDto {
  @ApiProperty({
    description: 'Lightning address',
  })
  address: string;

  @ApiProperty({
    description: 'Lightning address as LNURL',
  })
  addressLnurl: string;

  @ApiProperty({
    description: 'Lightning address ownership proof',
  })
  addressOwnershipProof: string;

  @ApiProperty({
    description: 'Lightning wallets',
    type: LnWalletDto,
    isArray: true,
  })
  wallets: LnWalletDto[];
}
