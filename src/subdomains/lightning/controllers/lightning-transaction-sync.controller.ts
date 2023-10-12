import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { RoleGuard } from 'src/shared/auth/role.guard';
import { WalletRole } from 'src/shared/auth/wallet-role.enum';
import { LightningOnchainTransactionQueryDto } from '../dto/lightning-onchain-transaction-query.dto';
import { LightningTransactionQueryDto } from '../dto/lightning-transaction-query.dto';
import { TransactionLightningEntity } from '../entities/transaction-lightning.entity';
import { TransactionOnchainEntity } from '../entities/transaction-onchain.entity';
import { LightningTransactionService } from '../services/lightning-transaction.service';
@ApiTags('Transaction')
@Controller('synchronize')
export class LightingTransactionSynchronizeController {
  constructor(private lightningTransactionService: LightningTransactionService) {}

  @Post('onchainTransactions')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.ADMIN))
  async syncOnchainTransactions(
    @Body() queryDto: LightningOnchainTransactionQueryDto,
  ): Promise<TransactionOnchainEntity[]> {
    return this.lightningTransactionService.syncOnchainTransactions(
      queryDto.startBlock,
      queryDto.endBlock,
      queryDto.withBalance,
    );
  }

  @Post('lightningTransactions')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.ADMIN))
  async syncLightningTransactions(
    @Body() queryDto: LightningTransactionQueryDto,
  ): Promise<TransactionLightningEntity[]> {
    return this.lightningTransactionService.syncLightningTransactions(
      queryDto.startDate,
      queryDto.endDate,
      queryDto.withBalance,
    );
  }
}
