import { LightningLogger } from 'src/shared/services/lightning-logger';
import { QueueHandler } from 'src/shared/utils/queue-handler';
import WebSocket from 'ws';

export class LightningWebSocketClient {
  private readonly logger = new LightningLogger(LightningWebSocketClient);

  private readonly webSocket: WebSocket;
  private readonly queue: QueueHandler;

  constructor(private wsUrl: string, macaroon: string) {
    if (!wsUrl) throw new Error('WebSocket URL not found');
    if (!macaroon) throw new Error('Macaroon not found');

    this.webSocket = new WebSocket(wsUrl, {
      rejectUnauthorized: false,
      headers: {
        'Grpc-Metadata-Macaroon': macaroon,
      },
    });

    this.queue = new QueueHandler();
  }

  setup(openRequestBody: any, messageCallback: (message) => Promise<void>) {
    this.webSocket.on('open', () => {
      this.logger.info(`WebSocket ${this.wsUrl}: open`);

      this.webSocket.send(JSON.stringify(openRequestBody));
    });

    this.webSocket.on('error', (err) => {
      this.logger.error(err);
    });

    this.webSocket.on('close', () => {
      this.logger.info(`WebSocket ${this.wsUrl}: close`);
    });

    this.webSocket.on('message', (message) => {
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
