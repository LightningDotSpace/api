import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetAccountEntity } from './entities/asset-account.entity';
import { AssetTransferEntity } from './entities/asset-transfer.entity';
import { AssetAccountRepository } from './repositories/asset-account.repository';
import { AssetTransferRepository } from './repositories/asset-transfer.repository';
import { AssetService } from './services/asset.service';

@Module({
  imports: [TypeOrmModule.forFeature([AssetAccountEntity, AssetTransferEntity])],
  controllers: [],
  providers: [AssetService, AssetAccountRepository, AssetTransferRepository],
  exports: [AssetService],
})
export class AssetModule {}
