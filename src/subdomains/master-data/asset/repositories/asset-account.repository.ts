import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/shared/db/base.repository';
import { EntityManager } from 'typeorm';
import { AssetAccountEntity } from '../entities/asset-account.entity';

@Injectable()
export class AssetAccountRepository extends BaseRepository<AssetAccountEntity> {
  constructor(manager: EntityManager) {
    super(AssetAccountEntity, manager);
  }
}
