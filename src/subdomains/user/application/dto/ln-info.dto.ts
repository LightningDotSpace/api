import { ApiProperty } from '@nestjs/swagger';
import { AssetDto } from 'src/subdomains/master-data/asset/dto/asset.dto';

export class LnWalletDto {
  @ApiProperty({
    description: 'Lightning wallet asset',
    type: AssetDto,
  })
  asset: AssetDto;

  @ApiProperty({
    description: 'Lightning LndHUB admin URL',
  })
  lndhubAdminUrl?: string;

  @ApiProperty({
    description: 'Lightning LndHUB invoice URL',
  })
  lndhubInvoiceUrl?: string;
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
