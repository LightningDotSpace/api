import { ObjectLiteral } from 'typeorm';
import { BaseRepository } from './base.repository';

export class RepositoryRawIterator<T extends ObjectLiteral> {
  private numberOfEntries: number;
  private offset: number;
  private selection: string;
  private joins: string[];

  constructor(private repository: BaseRepository<any>, numberOfEntries: number, selection: string, joins?: string[]) {
    this.numberOfEntries = numberOfEntries;
    this.offset = 0;
    this.selection = selection;
    this.joins = joins ?? [];
  }

  async next(): Promise<T[]> {
    const query = this.repository
      .createQueryBuilder('entity')
      .select(this.selection)
      .orderBy({ 'entity.id': 'ASC' })
      .skip(this.offset)
      .take(this.numberOfEntries);

    for (const join of this.joins) {
      query.innerJoinAndSelect(`entity.${join}`, join);
    }

    const entities = await query.getRawMany<T>();

    this.offset += this.numberOfEntries;

    return entities;
  }
}
