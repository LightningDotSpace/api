import { ObjectLiteral, Repository } from 'typeorm';
import { Util } from '../utils/util';

export abstract class BaseRepository<T extends ObjectLiteral> extends Repository<T> {
  private numberOfEntries = 0;
  private offset = 0;

  async saveMany(entities: T[], transactionSize = 1000, batchSize = 100): Promise<T[]> {
    return Util.doInBatchesAndJoin(entities, (batch) => this.saveBatch(batch, batchSize), transactionSize);
  }

  private async saveBatch(entities: T[], batchSize: number): Promise<T[]> {
    return this.manager.transaction(async (manager) => {
      return Util.doInBatchesAndJoin(entities, (batch) => manager.save(batch), batchSize);
    });
  }

  async first(numberOfEntries: number): Promise<T[]> {
    this.numberOfEntries = numberOfEntries;
    this.offset = 0;

    return this.createQueryBuilder().orderBy({ id: 'ASC' }).skip(this.offset).take(this.numberOfEntries).getMany();
  }

  async next(): Promise<T[]> {
    this.offset += this.numberOfEntries;

    return this.createQueryBuilder().orderBy({ id: 'ASC' }).skip(this.offset).take(this.numberOfEntries).getMany();
  }
}
