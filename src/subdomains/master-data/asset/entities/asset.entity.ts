import { IEntity } from 'src/shared/db/entity';
import { Column, Entity } from 'typeorm';

export enum AssetStatus {
  COMING_SOON = 'ComingSoon',
  ACTIVE = 'Active',
}

@Entity('asset')
export class AssetEntity extends IEntity {
  @Column({ unique: true })
  name: string;

  @Column()
  displayName: string;

  @Column({ nullable: true })
  description?: string;

  @Column()
  status: AssetStatus;
}
