import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { GetConfig } from 'src/config/config';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { AlchemyService } from 'src/subdomains/alchemy/services/alchemy.service';
import { EvmService } from '../shared/evm/evm.service';
import { EthereumClient } from './ethereum-client';

@Injectable()
export class EthereumService extends EvmService implements OnModuleInit, OnModuleDestroy {
  constructor(alchemyService: AlchemyService) {
    const { gatewayUrl, apiKey, chainId } = GetConfig().blockchain.ethereum;

    super(EthereumClient, {
      alchemyService,
      gatewayUrl,
      apiKey,
      chainId,
    });
  }

  onModuleInit() {
    super.onModuleInit();
  }

  onModuleDestroy() {
    super.onModuleDestroy();
  }

  get blockchain(): Blockchain {
    return Blockchain.ETHEREUM;
  }
}
