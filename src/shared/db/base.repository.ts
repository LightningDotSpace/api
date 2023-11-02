import { ObjectLiteral, Repository } from 'typeorm';
import { Util } from '../utils/util';
import { RepositoryIterator } from './repository.iterator';

export abstract class BaseRepository<T extends ObjectLiteral> extends Repository<T> {
  async saveMany(entities: T[], transactionSize = 1000, batchSize = 100): Promise<T[]> {
    return Util.doInBatchesAndJoin(entities, (batch) => this.saveBatch(batch, batchSize), transactionSize);
  }

  private async saveBatch(entities: T[], batchSize: number): Promise<T[]> {
    return this.manager.transaction(async (manager) => {
      return Util.doInBatchesAndJoin(entities, (batch) => manager.save(batch), batchSize);
    });
  }

  getIterator(numberOfEntries: number): RepositoryIterator<T> {
    return new RepositoryIterator<T>(this, numberOfEntries);
  }

  getRawIterator<U extends ObjectLiteral>(numberOfEntries: number, selection: string): RepositoryIterator<U> {
    return new RepositoryIterator<U>(this, numberOfEntries, selection);
  }
}
