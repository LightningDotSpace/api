import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/shared/db/base.repository';
import { EntityManager } from 'typeorm';
import { User } from '../../domain/entities/user.entity';

@Injectable()
export class UserRepository extends BaseRepository<User> {
  constructor(manager: EntityManager) {
    super(User, manager);
  }
}
