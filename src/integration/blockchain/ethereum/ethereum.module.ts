import { Module } from '@nestjs/common';
import { AlchemyModule } from 'src/subdomains/alchemy/alchemy.module';
import { EvmRegistryModule } from '../shared/evm/registry/evm-registry.module';
import { EthereumService } from './ethereum.service';

@Module({
  imports: [EvmRegistryModule, AlchemyModule],
  providers: [EthereumService],
  exports: [EthereumService],
})
export class EthereumModule {}
