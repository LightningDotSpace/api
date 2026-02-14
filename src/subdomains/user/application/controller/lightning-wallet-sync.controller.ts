import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { RoleGuard } from 'src/shared/auth/role.guard';
import { WalletRole } from 'src/shared/auth/wallet-role.enum';
import { UserBoltcardEntity } from '../../domain/entities/user-boltcard.entity';
import { UserTransactionEntity } from '../../domain/entities/user-transaction.entity';
import { LightningUserBoltcardQueryDto } from '../dto/lightning-userboltcard-query.dto';
import { LightningUserTransactionQueryDto } from '../dto/lightning-usertransaction-query.dto';
import { LightningWalletService } from '../services/lightning-wallet.service';
import { UserBoltcardService } from '../services/user-boltcard.service';

@ApiTags('Transaction')
@Controller('synchronize')
export class LightningWalletSynchronizeController {
  constructor(
    private readonly lightningWalletService: LightningWalletService,
    private readonly userBoltcardService: UserBoltcardService,
  ) {}

  @Post('userTransactions')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.ADMIN))
  async syncLightningUserTransactions(
    @Body() queryDto: LightningUserTransactionQueryDto,
  ): Promise<UserTransactionEntity[]> {
    return this.lightningWalletService.syncLightningUserTransactions(
      queryDto.startDate,
      queryDto.endDate,
      queryDto.address,
      queryDto.withBalance,
    );
  }

  @Post('userBoltcards')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.ADMIN))
  async syncLightningUserBoltcards(@Body() queryDto: LightningUserBoltcardQueryDto): Promise<UserBoltcardEntity[]> {
    return this.userBoltcardService.syncUserBoltcards(queryDto.addresses);
  }
}
