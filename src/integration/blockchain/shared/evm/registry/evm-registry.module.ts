import { Module } from '@nestjs/common';
import { EvmRegistryService } from './evm-registry.service';

@Module({
  imports: [],
  providers: [EvmRegistryService],
  exports: [EvmRegistryService],
})
export class EvmRegistryModule {}
