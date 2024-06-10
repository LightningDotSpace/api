import { ObjectLiteral } from 'typeorm';
import { BaseRepository } from './base.repository';

export class RepositoryIterator<T extends ObjectLiteral> {
  private numberOfEntries: number;
  private offset: number;
  private joins: string[];

  constructor(private repository: BaseRepository<T>, numberOfEntries: number, joins?: string[]) {
    this.numberOfEntries = numberOfEntries;
    this.offset = 0;
    this.joins = joins ?? [];
  }

  async next(): Promise<T[]> {
    const query = this.repository
      .createQueryBuilder('entity')
      .orderBy({ 'entity.id': 'ASC' })
      .skip(this.offset)
      .take(this.numberOfEntries);

    for (const join of this.joins) {
      query.innerJoinAndSelect(`entity.${join}`, join);
    }

    const entities = await query.getMany();

    this.offset += this.numberOfEntries;

    return entities;
  }
}
