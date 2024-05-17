import { Injectable } from '@nestjs/common';
import { GetConfig } from 'src/config/config';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { AlchemyService } from 'src/subdomains/alchemy/services/alchemy.service';
import { EvmService } from '../shared/evm/evm.service';
import { PolygonClient } from './polygon-client';

@Injectable()
export class PolygonService extends EvmService {
  constructor(alchemyService: AlchemyService) {
    const { gatewayUrl, apiKey, chainId } = GetConfig().blockchain.polygon;

    super(PolygonClient, {
      alchemyService,
      gatewayUrl,
      apiKey,
      chainId,
    });
  }

  get blockchain(): Blockchain {
    return Blockchain.POLYGON;
  }
}
