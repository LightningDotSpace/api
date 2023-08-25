import { ApiProperty } from '@nestjs/swagger';
import { LnInfoDto } from './ln-info.dto';

export class WalletDto {
  @ApiProperty({
    description: 'Wallet address',
  })
  address: string;

  @ApiProperty({
    description: 'Lightning info',
    type: LnInfoDto,
  })
  lightning: LnInfoDto;
}
