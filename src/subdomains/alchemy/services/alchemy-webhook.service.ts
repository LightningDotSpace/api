import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { AddressActivityWebhook, Alchemy, Network, Webhook, WebhookType } from 'alchemy-sdk';
import { Observable, Subject, filter } from 'rxjs';
import { Config, Environment, GetConfig } from 'src/config/config';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { Util } from 'src/shared/utils/util';
import { AlchemyNetworkMapper } from '../alchemy-network-mapper';
import { AlchemyWebhookDto } from '../dto/alchemy-webhook.dto';

@Injectable()
export class AlchemyWebhookService implements OnModuleInit {
  private alchemy: Alchemy;

  private webhookCache: Map<string, string>;

  private frankencoinPaymentWebhookSubject: Subject<AlchemyWebhookDto>;

  constructor() {
    const config = GetConfig();

    const alchemySettings = {
      apiKey: config.alchemy.apiKey,
      authToken: config.alchemy.authToken,
    };

    this.alchemy = new Alchemy(alchemySettings);

    this.webhookCache = new Map();

    this.frankencoinPaymentWebhookSubject = new Subject<AlchemyWebhookDto>();
  }

  async onModuleInit() {
    if (GetConfig().environment === Environment.LOC) return;

    const allWebhooks = await this.getAllWebhooks();
    allWebhooks.forEach((w) => this.webhookCache.set(w.id, w.signingKey));
  }

  isValidWebhookSignature(alchemySignature: string, dto: AlchemyWebhookDto): boolean {
    const signingKey = this.webhookCache.get(dto.webhookId);
    if (!signingKey) return false;

    const checkSignature = Util.createHmac(signingKey, JSON.stringify(dto));
    return alchemySignature === checkSignature;
  }

  getFrankencoinPaymentWebhookObservable(network: Network): Observable<AlchemyWebhookDto> {
    return this.frankencoinPaymentWebhookSubject
      .asObservable()
      .pipe(filter((data) => network === Network[data.event.network]));
  }

  processFrankencoinPaymentWebhook(dto: AlchemyWebhookDto): void {
    this.frankencoinPaymentWebhookSubject.next(dto);
  }

  async createFrankencoinPaymentWebhooks(): Promise<AddressActivityWebhook[]> {
    const result: AddressActivityWebhook[] = [];

    const url = `${Config.url}/alchemy/frankencoin-payment-webhook`;
    const addresses = [Config.payment.evmAddress];

    const blockchains = [
      Blockchain.ETHEREUM,
      Blockchain.ARBITRUM,
      Blockchain.OPTIMISM,
      Blockchain.POLYGON,
      Blockchain.BASE,
    ];

    for (const blockchain of blockchains) {
      result.push(await this.createAddressWebhook(blockchain, url, addresses));
    }

    return result;
  }

  private async createAddressWebhook(
    blockchain: Blockchain,
    webhookUrl: string,
    addresses: string[],
  ): Promise<AddressActivityWebhook> {
    const network = AlchemyNetworkMapper.toAlchemyNetworkByBlockchain(blockchain);
    if (!network) throw new NotFoundException(`Network not found by blockchain ${blockchain}`);

    const allWebhooks = await this.getAllWebhooks();
    const filteredWebhooks = allWebhooks.filter((wh) => wh.network === network && wh.url === webhookUrl);

    for (const webhookToBeDeleted of filteredWebhooks) {
      const webhookId = webhookToBeDeleted.id;
      this.webhookCache.delete(webhookId);
      await this.alchemy.notify.deleteWebhook(webhookId);
    }

    const newWebhook = await this.alchemy.notify.createWebhook(webhookUrl, WebhookType.ADDRESS_ACTIVITY, {
      addresses,
      network,
    });

    this.webhookCache.set(newWebhook.id, newWebhook.signingKey);

    return newWebhook;
  }

  private async getAllWebhooks(): Promise<Webhook[]> {
    return this.alchemy.notify.getAllWebhooks().then((r) => r.webhooks);
  }
}
