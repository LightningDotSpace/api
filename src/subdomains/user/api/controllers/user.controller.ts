import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { LightningService } from 'src/integration/blockchain/lightning/services/lightning.service';
import { GetJwt } from 'src/shared/auth/get-jwt.decorator';
import { JwtPayload } from 'src/shared/auth/jwt-payload.interface';
import { RoleGuard } from 'src/shared/auth/role.guard';
import { WalletRole } from 'src/shared/auth/wallet-role.enum';
import { WalletDto } from '../../application/dto/wallet.dto';
import { WalletMapper } from '../../application/dto/wallet.mapper';
import { WalletService } from '../../application/services/wallet.service';

@ApiTags('User')
@Controller('user')
export class UserController {
  constructor(private readonly walletService: WalletService, private readonly lightningService: LightningService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.USER))
  @ApiOkResponse({ type: WalletDto })
  async getUser(@GetJwt() jwt: JwtPayload): Promise<WalletDto> {
    return this.walletService
      .get(jwt.walletId)
      .then(WalletMapper.toDto)
      .then((w) => this.fillLightningInfo(w));
  }

  private async fillLightningInfo(wallet: WalletDto) {
    wallet.lnbitsUserInfo = await this.lightningService.getUserInfo(wallet.lnbitsUserId);
    return wallet;
  }
}
