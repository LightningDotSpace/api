import { Injectable } from '@nestjs/common';
import { Configuration, GetConfig } from 'src/config/config';
import { LightningLogger } from 'src/shared/services/lightning-logger';
import { LndOnchainTransactionDto, LndTransactionDto } from '../dto/lnd.dto';
import { LightningWebSocketClient } from '../lightning-ws-client';

@Injectable()
export class LightningWebSocketService {
  private readonly logger = new LightningLogger(LightningWebSocketService);

  private onchainWebSocketClient: LightningWebSocketClient<LndOnchainTransactionDto>;
  private invoiceWebSocketClient: LightningWebSocketClient<LndTransactionDto>;
  private paymentWebSocketClient: LightningWebSocketClient<LndTransactionDto>;

  constructor() {
    const config = GetConfig();
    this.setupOnchainWebSocketClient(config);
    this.setupInvoiceWebSocketClient(config);
    this.setupPaymentWebSocketClient(config);
  }

  subscribeToOnchainWebSocket(callback: (dto: LndOnchainTransactionDto) => void): void {
    this.onchainWebSocketClient.subscribe(callback);
  }

  subscribeInvoiceWebSocketSocket(callback: (dto: LndTransactionDto) => void): void {
    this.invoiceWebSocketClient.subscribe(callback);
  }

  subscribePaymentWebSocketSocket(callback: (dto: LndTransactionDto) => void): void {
    this.paymentWebSocketClient.subscribe(callback);
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

    this.onchainWebSocketClient.setup(requestBody, (message) => this.onchainMessage(message));
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

    this.invoiceWebSocketClient.setup(requestBody, (message) => this.invoiceMessage(message));
  }

  private setupPaymentWebSocketClient(config: Configuration) {
    this.paymentWebSocketClient = new LightningWebSocketClient(
      config.blockchain.lightning.lnd.wsPaymentsUrl,
      config.blockchain.lightning.lnd.adminMacaroon,
    );

    const requestBody = {
      no_inflight_updates: false,
    };

    this.paymentWebSocketClient.setup(requestBody, (message) => this.paymentMessage(message));
  }

  // --- Message Handling --- //
  private onchainMessage(message: any): void {
    const messageResult = JSON.parse(message).result;

    const onchainTransaction: LndOnchainTransactionDto = {
      tx_hash: messageResult.tx_hash,
      amount: messageResult.amount,
      block_height: messageResult.block_height,
      time_stamp: messageResult.time_stamp,
      total_fees: messageResult.total_fees,
    };

    this.onchainWebSocketClient.next(onchainTransaction);
  }

  private invoiceMessage(message: any): void {
    const messageResult = JSON.parse(message).result;

    const invoice: LndTransactionDto = {
      state: messageResult.state,
      transaction: Buffer.from(messageResult.r_hash, 'base64').toString('hex'),
      secret: Buffer.from(messageResult.r_preimage, 'base64').toString('hex'),
      amount: Number(messageResult.value),
      fee: 0,
      creationTimestamp: new Date(Number(messageResult.creation_date) * 1000),
      expiresTimestamp: new Date((Number(messageResult.creation_date) + Number(messageResult.expiry)) * 1000),
      confirmedTimestamp:
        '0' === messageResult.settle_date ? undefined : new Date(Number(messageResult.settle_date) * 1000),
      description: messageResult.memo,
      paymentRequest: messageResult.payment_request,
    };

    this.invoiceWebSocketClient.next(invoice);
  }

  private paymentMessage(message: any): void {
    const messageResult = JSON.parse(message).result;

    const payment: LndTransactionDto = {
      state: messageResult.status,
      transaction: messageResult.payment_hash,
      secret: messageResult.payment_preimage,
      amount: -Number(messageResult.value_sat),
      fee: -Number(messageResult.fee_sat),
      creationTimestamp: new Date(Number(messageResult.creation_time_ns) / 1000000),
      reason: messageResult.failure_reason,
      paymentRequest: messageResult.payment_request,
    };

    this.paymentWebSocketClient.next(payment);
  }
}
