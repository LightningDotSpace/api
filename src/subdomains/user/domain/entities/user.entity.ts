import { IEntity } from 'src/shared/db/entity';
import { Entity, OneToMany } from 'typeorm';
import { WalletEntity } from './wallet.entity';

@Entity('user')
export class UserEntity extends IEntity {
  @OneToMany(() => WalletEntity, (wallet) => wallet.user)
  wallets: WalletEntity[];
}
