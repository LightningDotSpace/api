import { BoltcardInfoDto } from 'src/integration/blockchain/lightning/dto/boltcards.dto';
import { IEntity } from 'src/shared/db/entity';
import { LightningWalletEntity } from 'src/subdomains/user/domain/entities/lightning-wallet.entity';
import { Column, Entity, ManyToOne } from 'typeorm';

export enum UserBoltcardStatus {
  ENABLED = 'enabled',
  DISABLED = 'disabled',
  DELETED = 'deleted',
}

@Entity('user_boltcard')
export class UserBoltcardEntity extends IEntity {
  @Column()
  status: UserBoltcardStatus;

  @Column({ unique: true })
  boltcardId: string;

  @Column()
  cardName: string;

  @Column()
  uid: string;

  @Column()
  externalId: string;

  @Column({ type: 'int' })
  counter: number;

  @Column({ type: 'float' })
  txLimit: number;

  @Column({ type: 'float' })
  dailyLimit: number;

  @Column()
  k0: string;

  @Column()
  k1: string;

  @Column()
  k2: string;

  @Column()
  prevK0: string;

  @Column()
  prevK1: string;

  @Column()
  prevK2: string;

  @Column()
  otp: string;

  @Column({ type: 'datetime' })
  creationTimestamp: Date;

  @ManyToOne(() => LightningWalletEntity, { eager: true })
  lightningWallet: LightningWalletEntity;

  // --- FACTORY METHODS --- //

  static create(boltcard: BoltcardInfoDto, lightningWallet?: LightningWalletEntity): UserBoltcardEntity {
    const entity = new UserBoltcardEntity();

    const isEnabled = ['true', '1'].includes(String(boltcard.enable).toLowerCase());

    entity.status = isEnabled ? UserBoltcardStatus.ENABLED : UserBoltcardStatus.DISABLED;
    entity.boltcardId = boltcard.id;
    entity.cardName = boltcard.card_name;
    entity.uid = boltcard.uid;
    entity.externalId = boltcard.external_id;
    entity.counter = boltcard.counter;
    entity.txLimit = boltcard.tx_limit;
    entity.dailyLimit = boltcard.daily_limit;
    entity.k0 = boltcard.k0;
    entity.k1 = boltcard.k1;
    entity.k2 = boltcard.k2;
    entity.prevK0 = boltcard.prev_k0;
    entity.prevK1 = boltcard.prev_k1;
    entity.prevK2 = boltcard.prev_k2;
    entity.otp = boltcard.otp;
    entity.creationTimestamp = new Date(boltcard.time * 1000);

    if (lightningWallet) entity.lightningWallet = lightningWallet;

    return entity;
  }
}
