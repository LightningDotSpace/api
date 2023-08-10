import { ApiProperty } from '@nestjs/swagger';
import { LnUserInfoDto } from 'src/integration/blockchain/lightning/dto/ln-userinfo.dto';

export class WalletDto {
  @ApiProperty({
    description: 'Wallet address',
  })
  address: string;

  @ApiProperty({
    description: 'Lightning User Id',
  })
  lightningUserId: string;

  @ApiProperty({
    description: 'Lightning Wallet Id',
  })
  lightningWalletId: string;

  @ApiProperty({
    description: 'Lightning LNURLp Id',
  })
  lightningLnurlpId: string;

  @ApiProperty({
    description: 'Lightning User Info',
  })
  lightningUserInfo?: LnUserInfoDto;
}
