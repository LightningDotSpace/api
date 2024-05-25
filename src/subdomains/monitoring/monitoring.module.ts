import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockchainModule } from 'src/integration/blockchain/blockchain.module';
import { EvmRegistryModule } from 'src/integration/blockchain/shared/evm/registry/evm-registry.module';
import { AssetModule } from '../master-data/asset/asset.module';
import { MonitoringBalanceEntity } from './entities/monitoring-balance.entity';
import { MonitoringEntity } from './entities/monitoring.entity';
import { MonitoringBalanceRepository } from './repositories/monitoring-balance.repository';
import { MonitoringRepository } from './repositories/monitoring.repository';
import { MonitoringService } from './services/monitoring.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([MonitoringEntity, MonitoringBalanceEntity]),
    AssetModule,
    BlockchainModule,
    EvmRegistryModule,
  ],
  controllers: [],
  providers: [MonitoringRepository, MonitoringBalanceRepository, MonitoringService],
  exports: [MonitoringService],
})
export class MonitoringModule {}
