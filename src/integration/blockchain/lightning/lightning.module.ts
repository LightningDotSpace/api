import { Module } from '@nestjs/common';
import { SharedModule } from 'src/shared/shared.module';
import { WalletRepository } from 'src/subdomains/user/application/repositories/wallet.repository';
import { LightingLndhubForwardController } from './controllers/lightning-lndhub-forward.controller';
import { LightingPaymentForwardController } from './controllers/lightning-payment-forward.controller';
import { LightingWellknownForwardController } from './controllers/lightning-wellknown-forward.controller';
import { LightningForwardService } from './services/lightning-forward.service';
import { LightningService } from './services/lightning.service';

@Module({
  imports: [SharedModule],
  controllers: [LightingLndhubForwardController, LightingWellknownForwardController, LightingPaymentForwardController],
  providers: [LightningService, LightningForwardService, WalletRepository],
  exports: [LightningService],
})
export class LightningModule {}
