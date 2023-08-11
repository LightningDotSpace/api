import { ApiProperty } from '@nestjs/swagger';
import { LnUserInfoDto } from 'src/integration/blockchain/lightning/dto/ln-userinfo.dto';

export class WalletDto {
  @ApiProperty({
    description: 'Wallet address',
  })
  address: string;

  @ApiProperty({
    description: 'LNbits User Id',
  })
  lnbitsUserId: string;

  @ApiProperty({
    description: 'LNbits User Info',
  })
  lnbitsUserInfo?: LnUserInfoDto;
}
