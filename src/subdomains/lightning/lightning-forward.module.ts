import { Module, forwardRef } from '@nestjs/common';
import { LightningModule } from 'src/integration/blockchain/lightning/lightning.module';
import { UmaModule } from 'src/integration/blockchain/uma/uma.module';
import { EvmModule } from '../evm/evm.module';
import { UserModule } from '../user/user.module';
import { LightingBoltcardsForwardController } from './controllers/lightning-boltcards-forward.controller';
import { LightingLndhubForwardController } from './controllers/lightning-lndhub-forward.controller';
import { LightingLnurlwForwardController } from './controllers/lightning-lnurlw-forward.controller';
import { LightingWellknownForwardController } from './controllers/lightning-wellknown-forward.controller';
import { LightningForwardService } from './services/lightning-forward.service';

@Module({
  imports: [LightningModule, forwardRef(() => UmaModule), UserModule, EvmModule],
  controllers: [
    LightingLndhubForwardController,
    LightingBoltcardsForwardController,
    LightingWellknownForwardController,
    LightingLnurlwForwardController,
  ],
  providers: [LightningForwardService],
  exports: [LightningForwardService],
})
export class LightningForwardModule {}
