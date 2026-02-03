import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/shared/db/base.repository';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { EntityManager, Equal } from 'typeorm';
import { AssetBoltzEntity } from '../entities/asset-boltz.entity';

@Injectable()
export class AssetBoltzRepository extends BaseRepository<AssetBoltzEntity> {
  constructor(manager: EntityManager) {
    super(AssetBoltzEntity, manager);
  }

  async getByBlockchain(blockchain: Blockchain): Promise<AssetBoltzEntity[]> {
    return this.findBy({ blockchain: Equal(blockchain) });
  }
}
