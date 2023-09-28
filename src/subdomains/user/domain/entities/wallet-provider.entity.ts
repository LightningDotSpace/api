import { IEntity } from 'src/shared/db/entity';
import { Column, Entity } from 'typeorm';

@Entity('wallet_provider')
export class WalletProviderEntity extends IEntity {
  @Column({ unique: true })
  name: string;
}
