import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { LnBitsTransactionDto } from '../dto/lnbits.dto';

@Injectable()
export class LnbitsWebHookService {
  private transactionWebhookSubject: Subject<LnBitsTransactionDto[]>;

  constructor() {
    this.transactionWebhookSubject = new Subject<LnBitsTransactionDto[]>();
  }

  getTransactionWebhookObservable(): Observable<LnBitsTransactionDto[]> {
    return this.transactionWebhookSubject.asObservable();
  }

  processTransactions(transactions: LnBitsTransactionDto[]): void {
    this.transactionWebhookSubject.next(transactions);
  }
}
