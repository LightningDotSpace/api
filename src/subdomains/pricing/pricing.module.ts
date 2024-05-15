import { Module } from '@nestjs/common';
import { CoinGeckoService } from './services/coingecko.service';

@Module({
  imports: [],
  controllers: [],
  providers: [CoinGeckoService],
  exports: [CoinGeckoService],
})
export class PricingModule {}
