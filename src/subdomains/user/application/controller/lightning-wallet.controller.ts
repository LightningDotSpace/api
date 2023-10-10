import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { RoleGuard } from 'src/shared/auth/role.guard';
import { WalletRole } from 'src/shared/auth/wallet-role.enum';
import { UserTransactionEntity } from '../../domain/entities/user-transaction.entity';
import { LightningUserTransactionQueryDto } from '../dto/lightning-usertransaction-query.dto';
import { LightningWalletService } from '../services/lightning-wallet.service';

@ApiTags('Transaction')
@Controller('synchronize')
export class LightningWalletController {
  constructor(private lightningWalletService: LightningWalletService) {}

  @Post('userTransactions')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.ADMIN))
  async syncLightningTransactions(
    @Body() queryDto: LightningUserTransactionQueryDto,
  ): Promise<UserTransactionEntity[]> {
    return this.lightningWalletService.syncLightningUserTransactions(
      queryDto.startDate,
      queryDto.endDate,
      queryDto.address,
      queryDto.withBalance,
    );
  }
}
