import { Injectable } from '@nestjs/common';
import { GetConfig } from 'src/config/config';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { AlchemyService } from 'src/subdomains/alchemy/services/alchemy.service';
import { EvmService } from '../shared/evm/evm.service';
import { OptimismClient } from './optimism-client';

@Injectable()
export class OptimismService extends EvmService {
  constructor(alchemyService: AlchemyService) {
    const { gatewayUrl, apiKey, chainId } = GetConfig().blockchain.optimism;

    super(OptimismClient, {
      alchemyService,
      gatewayUrl,
      apiKey,
      chainId,
    });
  }

  get blockchain(): Blockchain {
    return Blockchain.OPTIMISM;
  }
}
