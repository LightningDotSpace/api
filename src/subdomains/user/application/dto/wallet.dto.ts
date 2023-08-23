import { ApiProperty } from '@nestjs/swagger';
import { LnUserInfoDto } from 'src/subdomains/user/application/dto/ln-userinfo.dto';

export class WalletDto {
  @ApiProperty({
    description: 'Wallet address',
  })
  address: string;

  @ApiProperty({
    description: 'Lightning User Info',
  })
  lightningUserInfo: LnUserInfoDto;
}
