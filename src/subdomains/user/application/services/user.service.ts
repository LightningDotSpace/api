import { Injectable } from '@nestjs/common';
import { User } from '../../domain/entities/user.entity';
import { UserRepository } from '../repositories/user.repository';

@Injectable()
export class UserService {
  constructor(private readonly repo: UserRepository) {}

  async create(): Promise<User> {
    return this.repo.save({});
  }
}
