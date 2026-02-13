import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockchainModule } from 'src/integration/blockchain/blockchain.module';
import { EvmRegistryModule } from 'src/integration/blockchain/shared/evm/registry/evm-registry.module';
import { TelegramModule } from 'src/integration/telegram/telegram.module';
import { SharedModule } from 'src/shared/shared.module';
import { AlchemyWebhookModule } from '../alchemy/alchemy-webhook.module';
import { BoltzModule } from '../boltz/boltz.module';
import { AssetModule } from '../master-data/asset/asset.module';
import { PricingModule } from '../pricing/pricing.module';
import { MonitoringController } from './controllers/monitoring.controller';
import { MonitoringBalanceEntity } from './entities/monitoring-balance.entity';
import { MonitoringEvmBalanceEntity } from './entities/monitoring-evm-balance.entity';
import { MonitoringEntity } from './entities/monitoring.entity';
import { MonitoringBalanceRepository } from './repositories/monitoring-balance.repository';
import { MonitoringEvmBalanceRepository } from './repositories/monitoring-evm-balance.repository';
import { MonitoringRepository } from './repositories/monitoring.repository';
import { BalanceAlertService } from './services/balance-alert.service';
import { MonitoringEvmService } from './services/monitoring-evm.service';
import { MonitoringService } from './services/monitoring.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([MonitoringEntity, MonitoringBalanceEntity, MonitoringEvmBalanceEntity]),
    SharedModule,
    PricingModule,
    AssetModule,
    BlockchainModule,
    EvmRegistryModule,
    BoltzModule,
    AlchemyWebhookModule,
    TelegramModule,
  ],
  controllers: [MonitoringController],
  providers: [
    MonitoringRepository,
    MonitoringBalanceRepository,
    MonitoringEvmBalanceRepository,
    MonitoringService,
    MonitoringEvmService,
    BalanceAlertService,
  ],
  exports: [MonitoringService, MonitoringEvmService],
})
export class MonitoringModule {}
