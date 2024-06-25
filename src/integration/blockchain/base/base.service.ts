import { Injectable } from '@nestjs/common';
import { GetConfig } from 'src/config/config';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { AlchemyService } from 'src/subdomains/alchemy/services/alchemy.service';
import { EvmService } from '../shared/evm/evm.service';
import { BaseClient } from './base-client';

@Injectable()
export class BaseService extends EvmService {
  constructor(alchemyService: AlchemyService) {
    const { gatewayUrl, apiKey, chainId } = GetConfig().blockchain.base;

    super(BaseClient, {
      alchemyService,
      gatewayUrl,
      apiKey,
      chainId,
    });
  }

  get blockchain(): Blockchain {
    return Blockchain.BASE;
  }
}
