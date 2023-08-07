import { IEntity } from 'src/shared/entities/entity';
import { Column, Entity } from 'typeorm';

@Entity()
export class WalletProvider extends IEntity {
  @Column({ unique: true })
  name: string;
}
