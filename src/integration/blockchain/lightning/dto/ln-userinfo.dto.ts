import { ApiProperty } from '@nestjs/swagger';

export class LnUserInfoDto {
  @ApiProperty({
    description: 'Lightning User address',
  })
  address: string;

  @ApiProperty({
    description: 'Lightning Admin Key',
  })
  adminKey: string;

  @ApiProperty({
    description: 'Lightning Invoice Key',
  })
  invoiceKey: string;

  @ApiProperty({
    description: 'Lightning LNDHUB URL',
  })
  lndhubUrl: string;
}
