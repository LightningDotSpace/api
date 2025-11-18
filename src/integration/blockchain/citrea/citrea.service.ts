import { Injectable } from '@nestjs/common';
import { GetConfig } from 'src/config/config';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { HttpService } from 'src/shared/services/http.service';
import { AlchemyService } from 'src/subdomains/alchemy/services/alchemy.service';
import { EvmService } from '../shared/evm/evm.service';
import { CitreaClient } from './citrea-client';

@Injectable()
export class CitreaService extends EvmService {
  constructor(http: HttpService, alchemyService: AlchemyService) {
    const { gatewayUrl, chainId } = GetConfig().blockchain.citrea;

    super(CitreaClient, {
      http: http,
      alchemyService,
      gatewayUrl,
      apiKey: '',
      chainId,
    });
  }

  get blockchain(): Blockchain {
    return Blockchain.CITREA;
  }
}
