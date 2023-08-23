import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { LightningService } from 'src/integration/blockchain/lightning/services/lightning.service';
import { GetJwt } from 'src/shared/auth/get-jwt.decorator';
import { JwtPayload } from 'src/shared/auth/jwt-payload.interface';
import { RoleGuard } from 'src/shared/auth/role.guard';
import { WalletRole } from 'src/shared/auth/wallet-role.enum';
import { WalletDto } from '../../application/dto/wallet.dto';
import { WalletService } from '../../application/services/wallet.service';
import { Wallet } from '../../domain/entities/wallet.entity';

@ApiTags('User')
@Controller('user')
export class UserController {
  constructor(private readonly walletService: WalletService, private readonly lightningService: LightningService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.USER))
  @ApiOkResponse({ type: WalletDto })
  async getUser(@GetJwt() jwt: JwtPayload): Promise<WalletDto> {
    return this.walletService.get(jwt.walletId).then((w) => this.createWalletDto(w));
  }

  private async createWalletDto(wallet: Wallet | null): Promise<WalletDto> {
    const walletDto = new WalletDto();

    if (wallet) {
      const lightningUserInfo = await this.lightningService.getUserInfo(wallet.lnbitsUserId);

      walletDto.address = wallet.address;
      walletDto.lightningUserInfo = lightningUserInfo;
    }

    return walletDto;
  }
}
