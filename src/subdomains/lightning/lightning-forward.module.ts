import { Module } from '@nestjs/common';
import { LightningModule } from 'src/integration/blockchain/lightning/lightning.module';
import { WalletService } from '../user/application/services/wallet.service';
import { UserModule } from '../user/user.module';
import { LightingLndhubForwardController } from './controllers/lightning-lndhub-forward.controller';
import { LightingPaymentForwardController } from './controllers/lightning-payment-forward.controller';
import { LightingWellknownForwardController } from './controllers/lightning-wellknown-forward.controller';
import { LightningForwardService } from './services/lightning-forward.service';

@Module({
  imports: [LightningModule, UserModule],
  controllers: [LightingLndhubForwardController, LightingWellknownForwardController, LightingPaymentForwardController],
  providers: [LightningForwardService, WalletService],
  exports: [],
})
export class LightningForwardModule {}
