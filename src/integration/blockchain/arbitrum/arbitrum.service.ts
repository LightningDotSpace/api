import { Injectable } from '@nestjs/common';
import { GetConfig } from 'src/config/config';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { AlchemyService } from 'src/subdomains/alchemy/services/alchemy.service';
import { EvmService } from '../shared/evm/evm.service';
import { ArbitrumClient } from './arbitrum-client';

@Injectable()
export class ArbitrumService extends EvmService {
  constructor(alchemyService: AlchemyService) {
    const { gatewayUrl, apiKey, chainId } = GetConfig().blockchain.arbitrum;

    super(ArbitrumClient, {
      alchemyService,
      gatewayUrl,
      apiKey,
      chainId,
    });
  }

  get blockchain(): Blockchain {
    return Blockchain.ARBITRUM;
  }
}
