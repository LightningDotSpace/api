import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssetAccountDto } from 'src/subdomains/master-data/asset/dto/asset-account.dto';

export class LnWalletDto {
  @ApiProperty({
    description: 'Lightning wallet asset',
    type: AssetAccountDto,
  })
  asset: AssetAccountDto;

  @ApiPropertyOptional({
    description: 'Lightning LNbits Wallet Id',
  })
  lnbitsWalletId?: string;

  @ApiPropertyOptional({
    description: 'Lightning LndHUB admin URL',
  })
  lndhubAdminUrl?: string;

  @ApiPropertyOptional({
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
