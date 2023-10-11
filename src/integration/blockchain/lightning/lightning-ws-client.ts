import { LightningLogger } from 'src/shared/services/lightning-logger';
import { QueueHandler } from 'src/shared/utils/queue-handler';
import WebSocket from 'ws';

export class LightningWebSocketClient {
  private readonly logger = new LightningLogger(LightningWebSocketClient);

  private webSocket: WebSocket;
  private readonly queue: QueueHandler;

  private readonly retryCounter = 6;
  private readonly retryWaitTimeSec = 10;
  private retryAttempt = 0;

  constructor(private wsUrl: string, private macaroon: string) {
    if (!wsUrl) throw new Error('WebSocket URL not found');
    if (!macaroon) throw new Error('Macaroon not found');

    this.createWebSocket();

    this.queue = new QueueHandler();
  }

  private createWebSocket() {
    this.webSocket = new WebSocket(this.wsUrl, {
      rejectUnauthorized: false,
      headers: {
        'Grpc-Metadata-Macaroon': this.macaroon,
      },
    });
  }

  setup(openRequestBody: any, messageCallback: (message) => Promise<void>) {
    this.webSocket.on('open', () => {
      this.logger.info(`WebSocket ${this.wsUrl}: open`);

      this.webSocket.send(JSON.stringify(openRequestBody));
    });

    this.webSocket.on('error', (err) => {
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

    this.webSocket.on('message', (message) => {
      this.retryAttempt = 0;

      this.queue
        .handle<void>(async () => messageCallback(message))
        .catch((e) => {
          this.logger.error(e);
        });
    });

    this.webSocket.on('ping', (pingMessage) => {
      this.webSocket.pong(pingMessage);
    });
  }
}
