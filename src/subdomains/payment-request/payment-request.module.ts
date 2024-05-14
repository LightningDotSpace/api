import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LnbitsWebhookModule } from 'src/integration/blockchain/lightning/lnbits-webhook.module';
import { AssetModule } from '../master-data/asset/asset.module';
import { PaymentRequestEntity } from './entities/payment-request.entity';
import { PaymentRequestRepository } from './repositories/payment-request.repository';
import { PaymentRequestService } from './services/payment-request.service';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentRequestEntity]), AssetModule, LnbitsWebhookModule],
  controllers: [],
  providers: [PaymentRequestRepository, PaymentRequestService],
  exports: [PaymentRequestService],
})
export class PaymentRequestModule {}
