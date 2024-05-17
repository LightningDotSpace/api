import { Module } from '@nestjs/common';
import { AlchemyModule } from 'src/subdomains/alchemy/alchemy.module';
import { EvmRegistryModule } from '../shared/evm/registry/evm-registry.module';
import { BaseService } from './base.service';

@Module({
  imports: [EvmRegistryModule, AlchemyModule],
  providers: [BaseService],
  exports: [],
})
export class BaseModule {}
