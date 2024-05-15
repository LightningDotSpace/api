import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/shared/db/base.repository';
import { EntityManager } from 'typeorm';
import { AssetTransferEntity } from '../entities/asset-transfer.entity';

@Injectable()
export class AssetTransferRepository extends BaseRepository<AssetTransferEntity> {
  constructor(manager: EntityManager) {
    super(AssetTransferEntity, manager);
  }
}
