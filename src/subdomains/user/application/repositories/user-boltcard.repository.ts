import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/shared/db/base.repository';
import { EntityManager } from 'typeorm';
import { UserBoltcardEntity } from '../../domain/entities/user-boltcard.entity';

@Injectable()
export class UserBoltcardRepository extends BaseRepository<UserBoltcardEntity> {
  constructor(manager: EntityManager) {
    super(UserBoltcardEntity, manager);
  }
}
