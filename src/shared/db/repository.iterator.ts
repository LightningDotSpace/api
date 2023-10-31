import { ObjectLiteral } from 'typeorm';
import { BaseRepository } from './base.repository';

export class RepositoryIterator<T extends ObjectLiteral> {
  private numberOfEntries: number;
  private offset: number;
  private select: string;

  constructor(private repository: BaseRepository<T>, numberOfEntries: number, select?: string) {
    this.numberOfEntries = numberOfEntries;
    this.offset = 0;
    this.select = select ?? '*';
  }

  async next(): Promise<T[]> {
    return this.nextEntities<T>();
  }

  async nextForType<U>(): Promise<U[]> {
    return this.nextEntities<U>();
  }

  private async nextEntities<U>(): Promise<U[]> {
    const entities = await this.repository
      .createQueryBuilder()
      .select(this.select)
      .orderBy({ id: 'ASC' })
      .skip(this.offset)
      .take(this.numberOfEntries)
      .getRawMany<U>();

    this.offset += this.numberOfEntries;

    return entities;
  }
}
