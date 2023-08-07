import { IEntity } from 'src/shared/entities/entity';
import { Entity, OneToMany } from 'typeorm';

import { Wallet } from './wallet.entity';

@Entity()
export class User extends IEntity {
  @OneToMany(() => Wallet, (wallet) => wallet.user)
  wallets: Wallet[];

  
}
