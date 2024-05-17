import { Inject, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { EvmClient, EvmClientParams } from './evm-client';
import { EvmRegistryService } from './registry/evm-registry.service';

export abstract class EvmService implements OnModuleInit, OnModuleDestroy {
  private readonly client: EvmClient;

  @Inject() private readonly registry: EvmRegistryService;

  constructor(client: new (params) => EvmClient, params: EvmClientParams) {
    this.client = new client(params);
  }

  onModuleInit() {
    this.registry.add(this.blockchain, this);
  }

  onModuleDestroy() {
    this.registry.remove(this.blockchain);
  }

  getDefaultClient<T extends EvmClient>(): T {
    return this.client as T;
  }

  abstract get blockchain(): Blockchain;
}
