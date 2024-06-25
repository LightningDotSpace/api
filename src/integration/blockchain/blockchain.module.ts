import { Module } from '@nestjs/common';
import { ArbitrumModule } from './arbitrum/arbitrum.module';
import { BaseModule } from './base/base.module';
import { EthereumModule } from './ethereum/ethereum.module';
import { LightningModule } from './lightning/lightning.module';
import { OptimismModule } from './optimism/optimism.module';
import { PolygonModule } from './polygon/polygon.module';
import { CryptoService } from './services/crypto.service';
import { UmaModule } from './uma/uma.module';

@Module({
  imports: [LightningModule, UmaModule, EthereumModule, ArbitrumModule, OptimismModule, PolygonModule, BaseModule],
  controllers: [],
  providers: [CryptoService],
  exports: [CryptoService, LightningModule],
})
export class BlockchainModule {}
