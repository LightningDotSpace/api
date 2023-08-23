import { ApiProperty } from '@nestjs/swagger';

export class LnWalletDto {
  @ApiProperty({
    description: 'Lightning wallet asset',
  })
  asset: string;

  @ApiProperty({
    description: 'Lightning LndHUB invoice URL',
  })
  lndhubInvoiceUrl: string;

  @ApiProperty({
    description: 'Lightning LndHUB admin URL',
  })
  lndhubAdminUrl: string;
}

export class LnInfoDto {
  @ApiProperty({
    description: 'Lightning address',
  })
  address: string;

  @ApiProperty({
    description: 'Lightning wallets',
    type: LnWalletDto,
    isArray: true,
  })
  wallets: LnWalletDto[];
}
