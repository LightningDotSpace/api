import { Module } from '@nestjs/common';
import { LightningModule } from 'src/integration/blockchain/lightning/lightning.module';
import { LightningService } from 'src/integration/blockchain/lightning/services/lightning.service';
import { SharedModule } from 'src/shared/shared.module';
import { LightingWalletRepository } from '../user/application/repositories/lightning-wallet.repository';
import { UserModule } from '../user/user.module';
import { TransactionLightningRepository } from './repositories/transaction-lightning.repository';
import { TransactionOnchainRepository } from './repositories/transaction-onchain.repository';
import { UserTransactionRepository } from './repositories/user-transaction.repository';
import { LightningTransactionService } from './services/lightning-transaction.service';

@Module({
  imports: [LightningModule, UserModule, SharedModule],
  controllers: [],
  providers: [
    LightningService,
    LightningTransactionService,
    TransactionOnchainRepository,
    TransactionLightningRepository,
    UserTransactionRepository,
    LightingWalletRepository,
  ],
  exports: [],
})
export class LightningTransactionModule {}
