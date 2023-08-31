import { Module } from '@nestjs/common';
import { LightningModule } from './lightning/lightning.module';
import { CryptoService } from './services/crypto.service';

@Module({
  imports: [LightningModule],
  controllers: [],
  providers: [CryptoService],
  exports: [CryptoService, LightningModule],
})
export class BlockchainModule {}
