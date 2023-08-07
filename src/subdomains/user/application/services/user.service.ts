import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from '../../domain/entities/user.entity';
import { UserRepository } from '../repositories/user.repository';

@Injectable()
export class UserService {
  constructor(private readonly userRepo: UserRepository) {}

  async createUser(): Promise<User> {
    return this.userRepo.save({});
  }

  async updateUser(userId: number, dto: Partial<User>): Promise<User> {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');
    return this.userRepo.save(Object.assign(user, dto));
  }

  async getUser(userId: number): Promise<User> {
    return !userId ? null : this.userRepo.findOne({ where: { id: userId }, relations: ['wallets'] });
  }

  async getUserByKey(key: string, value: any): Promise<User> {
    return this.userRepo
      .createQueryBuilder('user')
      .select('user')
      .leftJoinAndSelect('user.wallets', 'wallets')
      .where(`user.${key} = :param`, { param: value })
      .getOne();
  }

  async getUserByAddressOrThrow(address: string): Promise<User> {
    const user = await this.userRepo.getByAddress(address);
    if (!user) throw new NotFoundException('User not found');

    return user;
  }

  async getAllUser(): Promise<User[]> {
    return this.userRepo.find();
  }

  async getWalletAddress(userId: number, walletId: number): Promise<string> {
    const user = await this.userRepo.findOne({ where: { id: userId }, relations: ['wallets'] });

    return user.wallets.find((w) => w.id === walletId).address;
  }
}
