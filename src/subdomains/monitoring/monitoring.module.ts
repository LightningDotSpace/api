import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockchainModule } from 'src/integration/blockchain/blockchain.module';
import { EvmRegistryModule } from 'src/integration/blockchain/shared/evm/registry/evm-registry.module';
import { AssetModule } from '../master-data/asset/asset.module';
import { UserModule } from '../user/user.module';
import { MonitoringBalanceEntity } from './entities/monitoring-balance.entity';
import { MonitoringBalanceRepository } from './repositories/monitoring-balance.repository';
import { MonitoringService } from './services/monitoring.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([MonitoringBalanceEntity]),
    UserModule,
    AssetModule,
    BlockchainModule,
    EvmRegistryModule,
  ],
  controllers: [],
  providers: [MonitoringBalanceRepository, MonitoringService],
  exports: [],
})
export class MonitoringModule {}
