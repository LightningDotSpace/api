import { Injectable } from '@nestjs/common';
import { HttpService } from 'src/shared/services/http.service';
import { BitcoinClient } from './bitcoin-client';

@Injectable()
export class BitcoinService {
  private readonly bitcoinClient: BitcoinClient;

  constructor(http: HttpService) {
    this.bitcoinClient = new BitcoinClient(http);
  }

  getDefaultClient(): BitcoinClient {
    return this.bitcoinClient;
  }
}
