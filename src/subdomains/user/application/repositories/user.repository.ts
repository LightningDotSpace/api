import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/shared/db/base.repository';
import { EntityManager } from 'typeorm';
import { UserEntity } from '../../domain/entities/user.entity';

@Injectable()
export class UserRepository extends BaseRepository<UserEntity> {
  constructor(manager: EntityManager) {
    super(UserEntity, manager);
  }
}
