import { Database, open } from 'sqlite';
import sqlite3 from 'sqlite3';
import { LnbitsApiLogger } from '../shared/lnbitsapi-logger';

class SqliteService {
  private readonly logger = new LnbitsApiLogger(SqliteService);

  constructor() {
    this.logger.verbose('SqliteService initialized');
  }

  async selectOne<T>(filename: string, sqlSelect: string): Promise<T | undefined> {
    let db: Database | undefined = undefined;

    try {
      db = await this.openRO(filename);
      return await db.get<T>(sqlSelect);
    } finally {
      await this.close(db);
    }
  }

  async selectAll<T>(filename: string, sqlSelect: string): Promise<T> {
    let db: Database | undefined = undefined;

    try {
      db = await this.openRO(filename);
      return await db.all<T>(sqlSelect);
    } finally {
      await this.close(db);
    }
  }

  async execute(filename: string, sql: string): Promise<void> {
    let db: Database | undefined = undefined;

    try {
      db = await this.openRW(filename);
      return await db.exec(sql);
    } finally {
      await this.close(db);
    }
  }

  async openRO(filename: string): Promise<Database> {
    return this.open(filename, sqlite3.OPEN_READONLY);
  }

  async openRW(filename: string): Promise<Database> {
    return this.open(filename, sqlite3.OPEN_READWRITE);
  }

  private async open(filename: string, mode: number): Promise<Database> {
    return open({
      filename: filename,
      driver: sqlite3.Database,
      mode: mode,
    });
  }

  async close(db?: Database): Promise<void> {
    if (db) await db.close();
  }
}

export const DBService: SqliteService = new SqliteService();
