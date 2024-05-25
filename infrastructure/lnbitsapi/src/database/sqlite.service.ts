import { Database, open } from 'sqlite';
import sqlite3 from 'sqlite3';
import { LnbitsApiLogger } from '../shared/lnbitsapi-logger';

class SqliteService {
  private readonly logger = new LnbitsApiLogger(SqliteService);

  constructor() {
    this.logger.info('SqliteService initialized');
  }

  async selectOne<T>(filename: string, sqlSelect: string): Promise<T | undefined> {
    let db: Database | undefined = undefined;

    try {
      db = await this.open(filename);
      return await db.get<T>(sqlSelect);
    } finally {
      await this.close(db);
    }
  }

  async selectAll<T>(filename: string, sqlSelect: string): Promise<T> {
    let db: Database | undefined = undefined;

    try {
      db = await this.open(filename);
      return await db.all<T>(sqlSelect);
    } finally {
      await this.close(db);
    }
  }

  private async open(filename: string): Promise<Database> {
    this.logger.info(`DB ${filename} open`);
    return open({
      filename: filename,
      driver: sqlite3.Database,
      mode: sqlite3.OPEN_READONLY,
    });
  }

  private async close(db?: Database): Promise<void> {
    this.logger.info(`DB ${db?.config.filename} close`);
    if (db) await db.close();
  }
}

export const DBService: SqliteService = new SqliteService();
