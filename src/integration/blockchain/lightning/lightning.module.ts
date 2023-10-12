import { Module } from '@nestjs/common';
import { SharedModule } from 'src/shared/shared.module';
import { LightningWebSocketService } from './services/lightning-ws.service';
import { LightningService } from './services/lightning.service';

@Module({
  imports: [SharedModule],
  controllers: [],
  providers: [LightningService, LightningWebSocketService],
  exports: [LightningService, LightningWebSocketService],
})
export class LightningModule {}
