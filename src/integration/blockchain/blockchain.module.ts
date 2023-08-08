import { Module } from '@nestjs/common';
import { CryptoService } from './services/crypto.service';

@Module({
  imports: [],
  controllers: [],
  providers: [CryptoService],
  exports: [CryptoService],
})
export class BlockchainModule {}
