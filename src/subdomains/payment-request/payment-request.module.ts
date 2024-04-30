import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetModule } from '../master-data/asset/asset.module';
import { PaymentRequestEntity } from './entities/payment-request.entity';
import { PaymentRequestRepository } from './repositories/payment-request.repository';
import { PaymentRequestService } from './services/payment-request.service';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentRequestEntity]), AssetModule],
  controllers: [],
  providers: [PaymentRequestRepository, PaymentRequestService],
  exports: [PaymentRequestService],
})
export class PaymentRequestModule {}
