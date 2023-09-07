import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Asset } from './entities/asset.entity';
import { AssetRepository } from './repositories/asset.repository';
import { AssetService } from './services/asset.service';

@Module({
  imports: [TypeOrmModule.forFeature([Asset])],
  controllers: [],
  providers: [AssetService, AssetRepository],
  exports: [AssetService],
})
export class AssetModule {}
