import { Module } from '@nestjs/common';
import { LightningModule } from 'src/integration/blockchain/lightning/lightning.module';
import { LightningService } from 'src/integration/blockchain/lightning/services/lightning.service';
import { SharedModule } from 'src/shared/shared.module';
import { TransactionLightningRepository } from './repositories/transaction-lightning.repository';
import { TransactionOnchainRepository } from './repositories/transaction-onchain.repository';
import { LightningTransactionService } from './services/lightning-transaction.service';

@Module({
  imports: [LightningModule, SharedModule],
  controllers: [],
  providers: [
    LightningService,
    LightningTransactionService,
    TransactionOnchainRepository,
    TransactionLightningRepository,
  ],
  exports: [LightningTransactionService],
})
export class LightningTransactionModule {}
