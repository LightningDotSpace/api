import { ObjectLiteral } from 'typeorm';
import { BaseRepository } from './base.repository';

export class RepositoryIterator<T extends ObjectLiteral> {
  private numberOfEntries: number;
  private offset: number;
  private selection: string;

  constructor(private repository: BaseRepository<any>, numberOfEntries: number, selection?: string) {
    this.numberOfEntries = numberOfEntries;
    this.offset = 0;
    this.selection = selection ?? '*';
  }

  async next(): Promise<T[]> {
    const entities = await this.repository
      .createQueryBuilder()
      .select(this.selection)
      .orderBy({ id: 'ASC' })
      .skip(this.offset)
      .take(this.numberOfEntries)
      .getRawMany<T>();

    this.offset += this.numberOfEntries;

    return entities;
  }
}
