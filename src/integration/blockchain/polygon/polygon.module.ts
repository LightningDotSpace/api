import { Module } from '@nestjs/common';
import { AlchemyModule } from 'src/subdomains/alchemy/alchemy.module';
import { EvmRegistryModule } from '../shared/evm/registry/evm-registry.module';
import { PolygonService } from './polygon.service';

@Module({
  imports: [EvmRegistryModule, AlchemyModule],
  providers: [PolygonService],
  exports: [],
})
export class PolygonModule {}
