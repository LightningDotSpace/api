import { Module } from '@nestjs/common';
import { AlchemyModule } from 'src/subdomains/alchemy/alchemy.module';
import { EvmRegistryModule } from '../shared/evm/registry/evm-registry.module';
import { ArbitrumService } from './arbitrum.service';

@Module({
  imports: [EvmRegistryModule, AlchemyModule],
  providers: [ArbitrumService],
  exports: [],
})
export class ArbitrumModule {}
