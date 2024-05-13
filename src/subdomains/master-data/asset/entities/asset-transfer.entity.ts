import { IEntity } from 'src/shared/db/entity';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { Column, Entity, Index } from 'typeorm';

export enum AssetTransferStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity('asset_transfer')
@Index((asset: AssetTransferEntity) => [asset.name, asset.blockchain], { unique: true })
export class AssetTransferEntity extends IEntity {
  @Column()
  name: string;

  @Column()
  displayName: string;

  @Column()
  status: AssetTransferStatus;

  @Column()
  blockchain: Blockchain;

  @Column({ nullable: true })
  address: string;
}
