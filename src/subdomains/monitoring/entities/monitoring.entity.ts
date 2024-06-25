import { IEntity } from 'src/shared/db/entity';
import { Column, Entity, Index } from 'typeorm';

@Entity('monitoring')
@Index((monitoring: MonitoringEntity) => [monitoring.type, monitoring.name], { unique: true })
export class MonitoringEntity extends IEntity {
  @Column()
  type: string;

  @Column()
  name: string;

  @Column()
  value: string;
}
