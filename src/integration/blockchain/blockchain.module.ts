import { Module } from '@nestjs/common';
import { LightningModule } from './lightning/lightning.module';
import { CryptoService } from './services/crypto.service';
import { UmaModule } from './uma/uma.module';

@Module({
  imports: [LightningModule, UmaModule],
  controllers: [],
  providers: [CryptoService],
  exports: [CryptoService, LightningModule],
})
export class BlockchainModule {}
