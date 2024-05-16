import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/shared/db/base.repository';
import { EntityManager } from 'typeorm';
import { MonitoringBalanceEntity } from '../entities/monitoring-balance.entity';

@Injectable()
export class MonitoringBalanceRepository extends BaseRepository<MonitoringBalanceEntity> {
  constructor(manager: EntityManager) {
    super(MonitoringBalanceEntity, manager);
  }

  async saveIfBalanceDiff(entity: MonitoringBalanceEntity): Promise<MonitoringBalanceEntity> {
    const maxEntity = await this.maxEntity(entity.asset.id);
    if (!maxEntity) return this.save(entity);

    const entityCheckSum = entity.onchainBalance + entity.lightningBalance + entity.customerBalance;
    const maxEntityCheckSum = maxEntity.onchainBalance + maxEntity.lightningBalance + maxEntity.customerBalance;
    if (entityCheckSum === maxEntityCheckSum) return maxEntity;

    return this.save(entity);
  }

  private async maxEntity(assetId: number): Promise<MonitoringBalanceEntity | null> {
    const maxId = await this.createQueryBuilder()
      .select('max(id) as maxId')
      .where('assetId = :assetId', { assetId })
      .getRawOne<{ maxId: number }>();
    if (!maxId) return null;

    return this.findOneBy({ id: maxId.maxId });
  }
}
