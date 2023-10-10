import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LightningModule } from 'src/integration/blockchain/lightning/lightning.module';
import { SharedModule } from 'src/shared/shared.module';
import { LightingTransactionController } from './controllers/lightning-transaction.contoller';
import { TransactionLightningEntity } from './entities/transaction-lightning.entity';
import { TransactionOnchainEntity } from './entities/transaction-onchain.entity';
import { TransactionLightningRepository } from './repositories/transaction-lightning.repository';
import { TransactionOnchainRepository } from './repositories/transaction-onchain.repository';
import { LightningTransactionService } from './services/lightning-transaction.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TransactionOnchainEntity, TransactionLightningEntity]),
    LightningModule,
    SharedModule,
  ],
  controllers: [LightingTransactionController],
  providers: [LightningTransactionService, TransactionOnchainRepository, TransactionLightningRepository],
  exports: [LightningTransactionService],
})
export class LightningTransactionModule {}
