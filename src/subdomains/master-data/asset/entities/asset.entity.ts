import { IEntity } from 'src/shared/db/entity';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { Column, Entity, Index } from 'typeorm';

export enum AssetType {
  COIN = 'Coin',
  TOKEN = 'Token',
}

export enum AssetStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
}

@Entity('asset')
@Index((asset: AssetEntity) => [asset.name, asset.type, asset.blockchain], { unique: true })
export class AssetEntity extends IEntity {
  @Column()
  name: string;

  @Column()
  displayName: string;

  @Column({ nullable: true })
  description?: string;

  @Column()
  status: AssetStatus;

  @Column({ default: AssetType.COIN })
  type: AssetType;

  @Column({ default: Blockchain.LIGHTNING })
  blockchain: Blockchain;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  symbol: string;

  @Column({ nullable: true, type: 'smallint' })
  minSendable: number;

  @Column({ nullable: true, type: 'bigint' })
  maxSendable: number;

  @Column({ nullable: true, type: 'smallint' })
  decimals: number;
}
