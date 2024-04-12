import { Module, forwardRef } from '@nestjs/common';
import { LightningModule } from 'src/integration/blockchain/lightning/lightning.module';
import { UmaModule } from 'src/integration/blockchain/uma/uma.module';
import { CoinGeckoService } from '../support/services/coingecko.service';
import { UserModule } from '../user/user.module';
import { LightingLndhubForwardController } from './controllers/lightning-lndhub-forward.controller';
import { LightingPaymentForwardController } from './controllers/lightning-payment-forward.controller';
import { LightingWellknownForwardController } from './controllers/lightning-wellknown-forward.controller';
import { LightningCurrencyService } from './services/lightning-currency.service';
import { LightningForwardService } from './services/lightning-forward.service';

@Module({
  imports: [LightningModule, forwardRef(() => UmaModule), UserModule],
  controllers: [LightingLndhubForwardController, LightingWellknownForwardController, LightingPaymentForwardController],
  providers: [LightningForwardService, LightningCurrencyService, CoinGeckoService],
  exports: [LightningForwardService, LightningCurrencyService],
})
export class LightningForwardModule {}
