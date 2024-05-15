import { Module } from '@nestjs/common';
import { LnbitsWebhookController } from './controllers/lnbits-webhook.controller';
import { LnbitsWebHookService } from './services/lnbits-webhook.service';

@Module({
  imports: [],
  controllers: [LnbitsWebhookController],
  providers: [LnbitsWebHookService],
  exports: [LnbitsWebHookService],
})
export class LnbitsWebhookModule {}
