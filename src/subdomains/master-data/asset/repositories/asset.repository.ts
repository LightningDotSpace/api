import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/shared/db/base.repository';
import { EntityManager } from 'typeorm';
import { AssetEntity } from '../entities/asset.entity';

@Injectable()
export class AssetRepository extends BaseRepository<AssetEntity> {
  constructor(manager: EntityManager) {
    super(AssetEntity, manager);
  }
}
