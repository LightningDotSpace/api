import { Agent } from 'https';
import { Subject } from 'rxjs';
import { GetConfig } from 'src/config/config';
import { LightningLogger } from 'src/shared/services/lightning-logger';
import WebSocket from 'ws';

export class LightningWebSocketClient<T> extends Subject<T> {
  private readonly logger = new LightningLogger(LightningWebSocketClient);

  private webSocket: WebSocket;

  private readonly retryCounter = 6;
  private readonly retryWaitTimeSec = 10;
  private retryAttempt = 0;

  constructor(private wsUrl: string, private macaroon: string) {
    super();

    if (!wsUrl) throw new Error('WebSocket URL not found');
    if (!macaroon) throw new Error('Macaroon not found');

    this.createWebSocket();
  }

  private createWebSocket() {
    const config = GetConfig();

    this.webSocket = new WebSocket(this.wsUrl, {
      agent: new Agent({
        ca: config.blockchain.lightning.certificate,
      }),

      headers: {
        'Grpc-Metadata-Macaroon': this.macaroon,
      },
    });
  }

  setup(openRequestBody: any, messageCallback: (message: any) => void) {
    this.webSocket.on('open', () => {
      this.logger.info(`WebSocket ${this.wsUrl}: open`);

      this.webSocket.send(JSON.stringify(openRequestBody));
    });

    this.webSocket.on('error', (err: any) => {
      this.logger.error(`WebSocket ${this.wsUrl}: error`, err);
    });

    this.webSocket.on('close', () => {
      this.logger.info(`WebSocket ${this.wsUrl}: close`);

      if (this.retryAttempt++ < this.retryCounter) {
        setTimeout(() => {
          this.logger.info(`WebSocket ${this.wsUrl}: retry ${this.retryAttempt}`);
          this.createWebSocket();
          this.setup(openRequestBody, messageCallback);
        }, this.retryWaitTimeSec * 1000);
      } else {
        this.logger.error(`WebSocket ${this.wsUrl}: closed after ${this.retryCounter} retries`);
      }
    });

    this.webSocket.on('message', (message: any) => {
      this.retryAttempt = 0;

      messageCallback(message);
    });

    this.webSocket.on('ping', (pingMessage: any) => {
      this.webSocket.pong(pingMessage);
    });
  }
}
