import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetAccountEntity } from './entities/asset-account.entity';
import { AssetTransferEntity } from './entities/asset-transfer.entity';
import { AssetEntity } from './entities/asset.entity';
import { AssetAccountRepository } from './repositories/asset-account.repository';
import { AssetTransferRepository } from './repositories/asset-transfer.repository';
import { AssetRepository } from './repositories/asset.repository';
import { AssetService } from './services/asset.service';

@Module({
  imports: [TypeOrmModule.forFeature([AssetEntity, AssetAccountEntity, AssetTransferEntity])],
  controllers: [],
  providers: [AssetService, AssetRepository, AssetAccountRepository, AssetTransferRepository],
  exports: [AssetService],
})
export class AssetModule {}
