import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { BoltcardWebhookTransferDto } from '../dto/boltcards.dto';
import { LnBitsTransactionDto } from '../dto/lnbits.dto';

@Injectable()
export class LnbitsWebHookService {
  private transactionWebhookSubject: Subject<LnBitsTransactionDto[]>;
  private boltcardWebhookSubject: Subject<BoltcardWebhookTransferDto>;

  constructor() {
    this.transactionWebhookSubject = new Subject<LnBitsTransactionDto[]>();
    this.boltcardWebhookSubject = new Subject<BoltcardWebhookTransferDto>();
  }

  getTransactionWebhookObservable(): Observable<LnBitsTransactionDto[]> {
    return this.transactionWebhookSubject.asObservable();
  }

  getBoltcardWebhookObservable(): Observable<BoltcardWebhookTransferDto> {
    return this.boltcardWebhookSubject.asObservable();
  }

  processTransactions(transactions: LnBitsTransactionDto[]): void {
    this.transactionWebhookSubject.next(transactions);
  }

  processBoltcards(webhookDto: BoltcardWebhookTransferDto): void {
    this.boltcardWebhookSubject.next(webhookDto);
  }
}
