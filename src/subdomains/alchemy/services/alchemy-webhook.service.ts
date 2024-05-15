import { Injectable } from '@nestjs/common';
import { Network } from 'alchemy-sdk';
import { Observable, Subject, filter } from 'rxjs';
import { AlchemyWebhookDto } from '../dto/alchemy-webhook.dto';

@Injectable()
export class AlchemyWebhookService {
  private addressWebhookSubject: Subject<AlchemyWebhookDto>;

  constructor() {
    this.addressWebhookSubject = new Subject<AlchemyWebhookDto>();
  }

  getAddressWebhookObservable(network: Network): Observable<AlchemyWebhookDto> {
    return this.addressWebhookSubject.asObservable().pipe(filter((data) => network === Network[data.event.network]));
  }

  processAddressWebhook(dto: AlchemyWebhookDto): void {
    this.addressWebhookSubject.next(dto);
  }
}
