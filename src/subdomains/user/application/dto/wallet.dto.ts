import { ApiProperty } from '@nestjs/swagger';

export class WalletDto {
  @ApiProperty({
    description: 'Address of the user',
  })
  address: string;
}
