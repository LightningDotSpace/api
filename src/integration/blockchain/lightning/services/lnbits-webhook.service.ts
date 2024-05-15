import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { LnBitsPaymentWebhookDto } from '../dto/lnbits.dto';

@Injectable()
export class LnbitsWebHookService {
  private paymentWebhookSubject: Subject<LnBitsPaymentWebhookDto>;

  constructor() {
    this.paymentWebhookSubject = new Subject<LnBitsPaymentWebhookDto>();
  }

  getPaymentWebhookObservable(): Observable<LnBitsPaymentWebhookDto> {
    return this.paymentWebhookSubject.asObservable();
  }

  processPayment(dto: LnBitsPaymentWebhookDto): void {
    this.paymentWebhookSubject.next(dto);
  }
}
