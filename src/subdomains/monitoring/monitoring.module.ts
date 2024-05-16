import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LightningModule } from 'src/integration/blockchain/lightning/lightning.module';
import { AssetModule } from '../master-data/asset/asset.module';
import { UserModule } from '../user/user.module';
import { MonitoringBalanceEntity } from './entities/monitoring-balance.entity';
import { MonitoringBalanceRepository } from './repositories/monitoring-balance.repository';
import { MonitoringService } from './services/monitoring.service';

@Module({
  imports: [TypeOrmModule.forFeature([MonitoringBalanceEntity]), UserModule, AssetModule, LightningModule],
  controllers: [],
  providers: [MonitoringBalanceRepository, MonitoringService],
  exports: [],
})
export class MonitoringModule {}
