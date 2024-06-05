import { Module } from '@nestjs/common';
import { AlchemyModule } from 'src/subdomains/alchemy/alchemy.module';
import { EvmRegistryModule } from '../shared/evm/registry/evm-registry.module';
import { OptimismService } from './optimism.service';

@Module({
  imports: [EvmRegistryModule, AlchemyModule],
  providers: [OptimismService],
  exports: [],
})
export class OptimismModule {}
