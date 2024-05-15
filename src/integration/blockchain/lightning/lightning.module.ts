import { Module } from '@nestjs/common';
import { SharedModule } from 'src/shared/shared.module';
import { AssetModule } from 'src/subdomains/master-data/asset/asset.module';
import { PaymentRequestModule } from 'src/subdomains/payment-request/payment-request.module';
import { PricingModule } from 'src/subdomains/pricing/pricing.module';
import { LightningCurrencyService } from './services/lightning-currency.service';
import { LightningWebSocketService } from './services/lightning-ws.service';
import { LightningService } from './services/lightning.service';

@Module({
  imports: [SharedModule, AssetModule, PricingModule, PaymentRequestModule],
  controllers: [],
  providers: [LightningService, LightningCurrencyService, LightningWebSocketService],
  exports: [LightningService, LightningCurrencyService, LightningWebSocketService],
})
export class LightningModule {}
