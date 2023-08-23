import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { LightningClient } from '../lightning-client';
import { LightningService } from './lightning.service';

@Injectable()
export class LightningForwardService {
  private readonly client: LightningClient;

  constructor(lightningService: LightningService) {
    this.client = lightningService.getDefaultClient();
  }

  async lndhubGet(req: Request, params: any): Promise<any> {
    const authorization = this.getAuthorization(req);

    const urlpart = this.getLastUrlPart(req);
    if (!urlpart) return null;

    return this.client.lndhubGet({ urlpart: urlpart, authorization: authorization, params: params });
  }

  async lndhubPost(req: Request, body: any, params: any): Promise<any> {
    const authorization = this.getAuthorization(req);

    const urlpart = this.getLastUrlPart(req);
    if (!urlpart) return null;

    return this.client.lndhubPost({
      urlpart: urlpart,
      authorization: authorization,
      body: body,
      params: params,
    });
  }

  // --- UTILITIES --- //
  private getAuthorization(req: Request): string | undefined {
    return req.header('Authorization');
  }

  private getLastUrlPart(req: Request): string | undefined {
    return req.url.split('/').at(-1);
  }
}
