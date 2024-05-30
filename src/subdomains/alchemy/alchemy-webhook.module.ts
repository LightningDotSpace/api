import { Module } from '@nestjs/common';
import { MonitoringModule } from '../monitoring/monitoring.module';
import { AlchemyController } from './controllers/alchemy.controller';
import { AlchemyWebhookService } from './services/alchemy-webhook.service';

@Module({
  imports: [MonitoringModule],
  controllers: [AlchemyController],
  providers: [AlchemyWebhookService],
  exports: [AlchemyWebhookService],
})
export class AlchemyWebhookModule {}
