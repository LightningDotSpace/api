import { Module } from '@nestjs/common';
import { BlockchainModule } from './blockchain/blockchain.module';

@Module({
  imports: [BlockchainModule],
  controllers: [],
  providers: [],
  exports: [BlockchainModule],
})
export class IntegrationModule {}
