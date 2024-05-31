import { Module } from '@nestjs/common';
import { SharedModule } from 'src/shared/shared.module';
import { AlchemyWebhookController } from './controllers/alchemy-webhook.controller';
import { AlchemyWebhookService } from './services/alchemy-webhook.service';

@Module({
  imports: [SharedModule],
  controllers: [AlchemyWebhookController],
  providers: [AlchemyWebhookService],
  exports: [AlchemyWebhookService],
})
export class AlchemyWebhookModule {}
