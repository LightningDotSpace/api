import { Module } from '@nestjs/common';
import { SharedModule } from 'src/shared/shared.module';
import { AlchemyModule } from 'src/subdomains/alchemy/alchemy.module';
import { EvmRegistryModule } from '../shared/evm/registry/evm-registry.module';
import { CitreaService } from './citrea.service';

@Module({
  imports: [SharedModule, EvmRegistryModule, AlchemyModule],
  providers: [CitreaService],
  exports: [],
})
export class CitreaModule {}
