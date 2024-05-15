import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/shared/db/base.repository';
import { EntityManager } from 'typeorm';
import { PaymentRequestEntity, PaymentRequestMethod, PaymentRequestState } from '../entities/payment-request.entity';

@Injectable()
export class PaymentRequestRepository extends BaseRepository<PaymentRequestEntity> {
  constructor(manager: EntityManager) {
    super(PaymentRequestEntity, manager);
  }

  async findPending(
    transferAmount: number,
    paymentMethod: PaymentRequestMethod,
  ): Promise<PaymentRequestEntity[] | undefined> {
    return this.findBy({ state: PaymentRequestState.PENDING, transferAmount, paymentMethod });
  }
}
