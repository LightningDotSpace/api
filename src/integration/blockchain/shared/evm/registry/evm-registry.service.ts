import { Injectable } from '@nestjs/common';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { Registry } from 'src/shared/utils/registry';
import { EvmClient } from '../evm-client';
import { EvmService } from '../evm.service';

@Injectable()
export class EvmRegistryService extends Registry<Blockchain, EvmService> {
  getClient(blockchain: Blockchain): EvmClient {
    const evmService = this.get(blockchain);
    if (!evmService) throw new Error(`No registered evm service found for Blockchain: ${blockchain}`);

    return evmService.getDefaultClient();
  }
}
