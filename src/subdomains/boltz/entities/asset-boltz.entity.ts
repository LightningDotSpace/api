import { IEntity } from 'src/shared/db/entity';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { Column, Entity, Index } from 'typeorm';

@Entity('asset_boltz')
@Index((asset: AssetBoltzEntity) => [asset.name, asset.blockchain], { unique: true })
export class AssetBoltzEntity extends IEntity {
  @Column()
  name: string;

  @Column()
  blockchain: Blockchain;

  @Column()
  address: string;

  @Column({ type: 'int' })
  decimals: number;
}
