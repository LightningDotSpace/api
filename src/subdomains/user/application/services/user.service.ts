import { Injectable } from '@nestjs/common';
import { UserEntity } from '../../domain/entities/user.entity';
import { UserRepository } from '../repositories/user.repository';

@Injectable()
export class UserService {
  constructor(private readonly repo: UserRepository) {}

  async create(): Promise<UserEntity> {
    return this.repo.save({});
  }
}
