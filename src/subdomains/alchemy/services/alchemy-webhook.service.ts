import { Injectable } from '@nestjs/common';
import { AddressActivityWebhook, Alchemy, GetAllWebhooksResponse, Network, WebhookType } from 'alchemy-sdk';
import { Observable, Subject, filter } from 'rxjs';
import { Config, GetConfig } from 'src/config/config';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { MonitoringService } from 'src/subdomains/monitoring/services/monitoring.service';
import { AlchemyNetworkMapper } from '../alchemy-network-mapper';
import { AlchemyWebhookDto } from '../dto/alchemy-webhook.dto';

@Injectable()
export class AlchemyWebhookService {
  private alchemy: Alchemy;

  private addressWebhookSubject: Subject<AlchemyWebhookDto>;

  constructor(private readonly monitoringService: MonitoringService) {
    const config = GetConfig();

    const alchemySettings = {
      apiKey: config.alchemy.apiKey,
      authToken: config.alchemy.authToken,
    };

    this.alchemy = new Alchemy(alchemySettings);

    this.addressWebhookSubject = new Subject<AlchemyWebhookDto>();
  }

  getAddressWebhookObservable(network: Network): Observable<AlchemyWebhookDto> {
    return this.addressWebhookSubject.asObservable().pipe(filter((data) => network === Network[data.event.network]));
  }

  processAddressWebhook(dto: AlchemyWebhookDto): void {
    this.addressWebhookSubject.next(dto);
  }

  async getAllWebhooks(): Promise<GetAllWebhooksResponse> {
    const allWebhooks = await this.alchemy.notify.getAllWebhooks();

    return allWebhooks;
  }

  async createFrankencoinMonitoringWebhook(): Promise<AddressActivityWebhook> {
    const network = AlchemyNetworkMapper.toAlchemyNetworkByBlockchain(Blockchain.ETHEREUM);
    const url = `${Config.url}/monitoring/frankencoin-monitoring-webhook`;

    const allWebhooks = await this.alchemy.notify.getAllWebhooks();

    const filteredWebhooks = allWebhooks.webhooks.filter((wh) => wh.network === network && wh.url === url);

    for (const webhookToBeDeleted of filteredWebhooks) {
      const webhookId = webhookToBeDeleted.id;
      await this.monitoringService.deleteWebhookInfo(webhookId);
      await this.alchemy.notify.deleteWebhook(webhookId);
    }

    const newWebhook = await this.alchemy.notify.createWebhook(url, WebhookType.ADDRESS_ACTIVITY, {
      addresses: [Config.blockchain.frankencoin.contractAddress.equity],
      network: network,
    });

    await this.monitoringService.saveWebhookInfo(newWebhook.id, newWebhook.signingKey);

    return newWebhook;
  }
}
