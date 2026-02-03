import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockchainModule } from 'src/integration/blockchain/blockchain.module';
import { AlchemyModule } from '../alchemy/alchemy.module';
import { BoltzBalanceController } from './controllers/boltz-balance.controller';
import { AssetBoltzEntity } from './entities/asset-boltz.entity';
import { AssetBoltzRepository } from './repositories/asset-boltz.repository';
import { BoltzBalanceService } from './services/boltz-balance.service';

@Module({
  imports: [TypeOrmModule.forFeature([AssetBoltzEntity]), BlockchainModule, AlchemyModule],
  controllers: [BoltzBalanceController],
  providers: [AssetBoltzRepository, BoltzBalanceService],
  exports: [],
})
export class BoltzModule {}
