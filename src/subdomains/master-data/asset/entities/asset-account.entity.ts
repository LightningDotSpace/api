import { IEntity } from 'src/shared/db/entity';
import { Column, Entity } from 'typeorm';

export enum AssetAccountStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
}

@Entity('asset_account')
export class AssetAccountEntity extends IEntity {
  @Column({ unique: true })
  name: string;

  @Column()
  displayName: string;

  @Column()
  status: AssetAccountStatus;

  @Column({ nullable: true })
  symbol: string;

  @Column({ nullable: true, type: 'smallint' })
  minSendable: number;

  @Column({ nullable: true, type: 'bigint' })
  maxSendable: number;

  @Column({ nullable: true, type: 'smallint' })
  decimals: number;
}
