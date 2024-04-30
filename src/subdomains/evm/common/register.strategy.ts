import { Inject, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { LightningLogger } from 'src/shared/services/lightning-logger';
import { RegisterStrategyRegistry } from './register.strategy-registry';

export abstract class RegisterStrategy implements OnModuleInit, OnModuleDestroy {
  protected abstract readonly logger: LightningLogger;

  @Inject() private readonly registry: RegisterStrategyRegistry;

  onModuleInit() {
    this.registry.add(this.blockchain, this);
  }

  onModuleDestroy() {
    this.registry.remove(this.blockchain);
  }

  protected abstract get blockchain(): Blockchain;
}
