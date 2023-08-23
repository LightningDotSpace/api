import { ApiProperty } from '@nestjs/swagger';

export class LnUserInfoDto {
  @ApiProperty({
    description: 'Lightning User address',
  })
  address: string;

  @ApiProperty({
    description: 'Lightning User wallets',
  })
  wallets: LnWalletInfoDto[];
}

export class LnWalletInfoDto {
  @ApiProperty({
    description: 'Lightning Wallet Asset',
  })
  asset: string;

  @ApiProperty({
    description: 'Lightning Wallet LNDHUB Invoice URL',
  })
  lndhubInvoiceUrl: string;

  @ApiProperty({
    description: 'Lightning Wallet LNDHUB Admin URL',
  })
  lndhubAdminUrl: string;
}
