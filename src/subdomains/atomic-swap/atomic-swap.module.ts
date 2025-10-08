import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { AtomicSwapController } from './controllers/atomic-swap.controller';
import { AtomicSwapService } from './services/atomic-swap.service';
import { BoltzApiClientService } from './services/boltz-api-client.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
    ConfigModule,
  ],
  controllers: [AtomicSwapController],
  providers: [AtomicSwapService, BoltzApiClientService],
  exports: [AtomicSwapService],
})
export class AtomicSwapModule {}
