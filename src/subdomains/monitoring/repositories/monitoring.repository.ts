import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/shared/db/base.repository';
import { EntityManager } from 'typeorm';
import { MonitoringEntity } from '../entities/monitoring.entity';

@Injectable()
export class MonitoringRepository extends BaseRepository<MonitoringEntity> {
  constructor(manager: EntityManager) {
    super(MonitoringEntity, manager);
  }

  async saveIfValueDiff(entity: MonitoringEntity): Promise<MonitoringEntity> {
    const existEntity = await this.findOneBy({ type: entity.type, name: entity.name });
    if (!existEntity) return this.save(entity);

    if (existEntity.value === entity.value) return existEntity;

    existEntity.value = entity.value;

    return this.save(existEntity);
  }
}
