import { ObjectLiteral, Repository } from 'typeorm';
import { Util } from '../utils/util';

export abstract class BaseRepository<T extends ObjectLiteral> extends Repository<T> {
  private numberOfEntries = 0;
  private offset = 0;
  private select = '*';

  async saveMany(entities: T[], transactionSize = 1000, batchSize = 100): Promise<T[]> {
    return Util.doInBatchesAndJoin(entities, (batch) => this.saveBatch(batch, batchSize), transactionSize);
  }

  private async saveBatch(entities: T[], batchSize: number): Promise<T[]> {
    return this.manager.transaction(async (manager) => {
      return Util.doInBatchesAndJoin(entities, (batch) => manager.save(batch), batchSize);
    });
  }

  async first(numberOfEntries: number): Promise<T[]> {
    return this.flatFirst<T>(numberOfEntries, '*');
  }

  async next(): Promise<T[]> {
    return this.flatNext<T>();
  }

  async flatFirst<U>(numberOfEntries: number, select: string): Promise<U[]> {
    this.numberOfEntries = numberOfEntries;
    this.select = select;
    this.offset = 0;

    return this.createQueryBuilder()
      .select(select)
      .orderBy({ id: 'ASC' })
      .skip(this.offset)
      .take(this.numberOfEntries)
      .getRawMany<U>();
  }

  async flatNext<U>(): Promise<U[]> {
    this.offset += this.numberOfEntries;

    return this.createQueryBuilder()
      .select(this.select)
      .orderBy({ id: 'ASC' })
      .skip(this.offset)
      .take(this.numberOfEntries)
      .getRawMany<U>();
  }
}
