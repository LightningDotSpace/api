import { Module } from '@nestjs/common';
import { SharedModule } from 'src/shared/shared.module';
import { LightingForwardController } from './controllers/lightning-forward.controller';
import { LightningForwardService } from './services/lightning-forward.service';
import { LightningService } from './services/lightning.service';

@Module({
  imports: [SharedModule],
  controllers: [LightingForwardController],
  providers: [LightningService, LightningForwardService],
  exports: [LightningService, LightningForwardService],
})
export class LightningModule {}
