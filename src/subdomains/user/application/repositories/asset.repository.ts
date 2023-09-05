import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/shared/db/base.repository';
import { EntityManager } from 'typeorm';
import { Asset } from '../../domain/entities/asset.entity';

@Injectable()
export class AssetRepository extends BaseRepository<Asset> {
  constructor(manager: EntityManager) {
    super(Asset, manager);
  }
}
