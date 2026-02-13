import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/shared/db/base.repository';
import { EntityManager } from 'typeorm';
import { MonitoringBalanceEntity } from '../entities/monitoring-balance.entity';

@Injectable()
export class MonitoringBalanceRepository extends BaseRepository<MonitoringBalanceEntity> {
  constructor(manager: EntityManager) {
    super(MonitoringBalanceEntity, manager);
  }

  async getLatestBalances(): Promise<MonitoringBalanceEntity[]> {
    return this.createQueryBuilder('b')
      .innerJoin(
        (qb) =>
          qb
            .select('MAX(sub.id)', 'maxId')
            .from(MonitoringBalanceEntity, 'sub')
            .groupBy('sub.assetId'),
        'latest',
        'b.id = latest.maxId',
      )
      .leftJoinAndSelect('b.asset', 'asset')
      .getMany();
  }

  async saveIfBalanceDiff(entity: MonitoringBalanceEntity): Promise<MonitoringBalanceEntity> {
    const maxEntity = await this.maxEntity(entity.asset.id);
    if (!maxEntity) return this.save(entity);

    if (entity.checksum() === maxEntity.checksum()) return maxEntity;

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
