import { Database } from 'sqlite';
import { LnbitsApiLogger } from '../shared/lnbitsapi-logger';

class SqliteTransaction {
  private readonly logger = new LnbitsApiLogger(SqliteTransaction);

  constructor() {
    this.logger.verbose('SqliteTransaction initialized');
  }

  async start(db: Database): Promise<void> {
    return db.exec('BEGIN');
  }

  async commit(db: Database): Promise<void> {
    return db.exec('COMMIT');
  }

  async rollback(db: Database): Promise<void> {
    return db.exec('ROLLBACK');
  }
}

export const DBTransaction: SqliteTransaction = new SqliteTransaction();
