import { Injectable } from '@nestjs/common';
import { GetConfig } from 'src/config/config';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { HttpService } from 'src/shared/services/http.service';
import { AlchemyService } from 'src/subdomains/alchemy/services/alchemy.service';
import { EvmService } from '../shared/evm/evm.service';
import { RootstockClient } from './rootstock-client';

@Injectable()
export class RootstockService extends EvmService {
  constructor(http: HttpService, alchemyService: AlchemyService) {
    const { gatewayUrl, apiKey, chainId } = GetConfig().blockchain.rootstock;

    super(RootstockClient, {
      http: http,
      alchemyService,
      gatewayUrl,
      apiKey,
      chainId,
    });
  }

  get blockchain(): Blockchain {
    return Blockchain.ROOTSTOCK;
  }
}
