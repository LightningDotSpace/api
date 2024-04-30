import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/shared/db/base.repository';
import { EntityManager } from 'typeorm';
import { PaymentRequestEntity, PaymentRequestState } from '../entities/payment-request.entity';

@Injectable()
export class PaymentRequestRepository extends BaseRepository<PaymentRequestEntity> {
  constructor(manager: EntityManager) {
    super(PaymentRequestEntity, manager);
  }

  async findPendingByAmount(amount: number): Promise<PaymentRequestEntity[] | undefined> {
    return this.findBy({ state: PaymentRequestState.PENDING, transferAmount: amount });
  }
}
