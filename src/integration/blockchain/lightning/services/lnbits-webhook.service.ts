import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { BoltcardWebhookTransferDto } from '../dto/boltcards.dto';
import { LnBitsTransactionWebhookTransferDto } from '../dto/lnbits.dto';

@Injectable()
export class LnbitsWebHookService {
  private transactionWebhookSubject: Subject<LnBitsTransactionWebhookTransferDto>;
  private boltcardWebhookSubject: Subject<BoltcardWebhookTransferDto>;

  constructor() {
    this.transactionWebhookSubject = new Subject<LnBitsTransactionWebhookTransferDto>();
    this.boltcardWebhookSubject = new Subject<BoltcardWebhookTransferDto>();
  }

  getTransactionWebhookObservable(): Observable<LnBitsTransactionWebhookTransferDto> {
    return this.transactionWebhookSubject.asObservable();
  }

  getBoltcardWebhookObservable(): Observable<BoltcardWebhookTransferDto> {
    return this.boltcardWebhookSubject.asObservable();
  }

  processTransactions(webhookTransfer: LnBitsTransactionWebhookTransferDto): void {
    this.transactionWebhookSubject.next(webhookTransfer);
  }

  processBoltcards(webhookTransfer: BoltcardWebhookTransferDto): void {
    this.boltcardWebhookSubject.next(webhookTransfer);
  }
}
