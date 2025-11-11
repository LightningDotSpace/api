import { Module } from '@nestjs/common';
import { BerndEvmController } from 'src/zzz-bernd/blockchain/bernd-evm.controller';
import { ArbitrumModule } from './arbitrum/arbitrum.module';
import { BaseModule } from './base/base.module';
import { BitcoinModule } from './bitcoin/bitcoin.module';
import { EthereumModule } from './ethereum/ethereum.module';
import { LightningModule } from './lightning/lightning.module';
import { OptimismModule } from './optimism/optimism.module';
import { PolygonModule } from './polygon/polygon.module';
import { RootstockModule } from './rootstock/rootstock.module';
import { CryptoService } from './services/crypto.service';
import { UmaModule } from './uma/uma.module';

@Module({
  imports: [
    BitcoinModule,
    LightningModule,
    UmaModule,
    EthereumModule,
    ArbitrumModule,
    OptimismModule,
    PolygonModule,
    BaseModule,
    RootstockModule,
  ],
  controllers: [BerndEvmController],
  providers: [CryptoService],
  exports: [CryptoService, BitcoinModule, LightningModule],
})
export class BlockchainModule {}
