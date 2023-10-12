import { Injectable } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { Configuration, GetConfig } from 'src/config/config';
import { LndOnchainTransactionDto, LndTransactionDto } from '../dto/lnd.dto';
import { LightningWebSocketClient } from '../lightning-ws-client';

@Injectable()
export class LightningWebSocketService {
  private onchainWebSocketClient: LightningWebSocketClient<any>;
  private invoiceWebSocketClient: LightningWebSocketClient<any>;
  private paymentWebSocketClient: LightningWebSocketClient<any>;

  public onChainTransactions: Observable<LndOnchainTransactionDto>;
  public invoiceTransactions: Observable<LndTransactionDto>;
  public paymentTransactions: Observable<LndTransactionDto>;

  constructor() {
    const config = GetConfig();
    this.setupOnchainWebSocketClient(config);
    this.setupInvoiceWebSocketClient(config);
    this.setupPaymentWebSocketClient(config);

    this.onChainTransactions = this.onchainWebSocketClient.asObservable().pipe(map(this.mapOnchainMessage));
    this.invoiceTransactions = this.invoiceWebSocketClient.asObservable().pipe(map(this.mapInvoiceMessage));
    this.paymentTransactions = this.paymentWebSocketClient.asObservable().pipe(map(this.mapPaymentMessage));
  }

  private setupOnchainWebSocketClient(config: Configuration) {
    this.onchainWebSocketClient = new LightningWebSocketClient(
      config.blockchain.lightning.lnd.wsOnchainTransactionsUrl,
      config.blockchain.lightning.lnd.adminMacaroon,
    );

    const requestBody = {
      start_height: 0,
      end_height: -1,
      //account: '',
    };

    this.onchainWebSocketClient.setup(requestBody);
  }

  private setupInvoiceWebSocketClient(config: Configuration) {
    this.invoiceWebSocketClient = new LightningWebSocketClient(
      config.blockchain.lightning.lnd.wsInvoicesUrl,
      config.blockchain.lightning.lnd.adminMacaroon,
    );

    const requestBody = {
      add_index: '0',
      settle_index: '0',
    };

    this.invoiceWebSocketClient.setup(requestBody);
  }

  private setupPaymentWebSocketClient(config: Configuration) {
    this.paymentWebSocketClient = new LightningWebSocketClient(
      config.blockchain.lightning.lnd.wsPaymentsUrl,
      config.blockchain.lightning.lnd.adminMacaroon,
    );

    const requestBody = {
      no_inflight_updates: false,
    };

    this.paymentWebSocketClient.setup(requestBody);
  }

  // --- Message Handling --- //
  private mapOnchainMessage({ result }: any): LndOnchainTransactionDto {
    return {
      tx_hash: result.tx_hash,
      amount: result.amount,
      block_height: result.block_height,
      time_stamp: result.time_stamp,
      total_fees: result.total_fees,
    };
  }

  private mapInvoiceMessage({ result }: any): LndTransactionDto {
    return {
      state: result.state,
      transaction: Buffer.from(result.r_hash, 'base64').toString('hex'),
      secret: Buffer.from(result.r_preimage, 'base64').toString('hex'),
      amount: Number(result.value),
      fee: 0,
      creationTimestamp: new Date(Number(result.creation_date) * 1000),
      expiresTimestamp: new Date((Number(result.creation_date) + Number(result.expiry)) * 1000),
      confirmedTimestamp: '0' === result.settle_date ? undefined : new Date(Number(result.settle_date) * 1000),
      description: result.memo,
      paymentRequest: result.payment_request,
    };
  }

  private mapPaymentMessage({ result }: any): LndTransactionDto {
    return {
      state: result.status,
      transaction: result.payment_hash,
      secret: result.payment_preimage,
      amount: -Number(result.value_sat),
      fee: -Number(result.fee_sat),
      creationTimestamp: new Date(Number(result.creation_time_ns) / 1000000),
      reason: result.failure_reason,
      paymentRequest: result.payment_request,
    };
  }
}
