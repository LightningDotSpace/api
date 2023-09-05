import { IEntity } from 'src/shared/db/entity';
import { Column, Entity } from 'typeorm';

export enum AssetStatus {
  COMING_SOON = 'ComingSoon',
  ACTIVE = 'Active',
}

@Entity()
export class Asset extends IEntity {
  @Column({ length: 256 })
  name: string;

  @Column({ length: 256 })
  displayName: string;

  @Column({ length: 256, nullable: true })
  description: string;

  @Column({ length: 256 })
  status: AssetStatus;
}
