import Database from 'better-sqlite3';
import { Swap, SwapStatus } from '../types';

export class DatabaseService {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.initializeSchema();
    console.log(`Database initialized at ${dbPath}`);
  }

  private initializeSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS swaps (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL,

        preimage TEXT NOT NULL,
        preimageHash TEXT NOT NULL,
        claimPrivateKey TEXT NOT NULL,
        claimPublicKey TEXT NOT NULL,

        invoiceAmount INTEGER NOT NULL,
        invoice TEXT NOT NULL,
        invoicePaid INTEGER NOT NULL DEFAULT 0,

        lockupAddress TEXT,
        lockupTxId TEXT,
        lockupAmount INTEGER,
        timeoutBlockHeight INTEGER NOT NULL,
        claimAddress TEXT NOT NULL,

        claimTxId TEXT,
        claimedAt INTEGER
      )
    `);

    // Create indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_swaps_status ON swaps(status);
      CREATE INDEX IF NOT EXISTS idx_swaps_preimageHash ON swaps(preimageHash);
      CREATE INDEX IF NOT EXISTS idx_swaps_createdAt ON swaps(createdAt);
    `);
  }

  /**
   * Create a new swap
   */
  createSwap(swap: Swap): void {
    const stmt = this.db.prepare(`
      INSERT INTO swaps (
        id, status, createdAt, updatedAt,
        preimage, preimageHash, claimPrivateKey, claimPublicKey,
        invoiceAmount, invoice, invoicePaid,
        lockupAddress, lockupTxId, lockupAmount, timeoutBlockHeight, claimAddress,
        claimTxId, claimedAt
      ) VALUES (
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?
      )
    `);

    stmt.run(
      swap.id,
      swap.status,
      swap.createdAt,
      swap.updatedAt,
      swap.preimage,
      swap.preimageHash,
      swap.claimPrivateKey,
      swap.claimPublicKey,
      swap.invoiceAmount,
      swap.invoice,
      swap.invoicePaid ? 1 : 0,
      swap.lockupAddress || null,
      swap.lockupTxId || null,
      swap.lockupAmount || null,
      swap.timeoutBlockHeight,
      swap.claimAddress,
      swap.claimTxId || null,
      swap.claimedAt || null
    );
  }

  /**
   * Get swap by ID
   */
  getSwap(id: string): Swap | null {
    const stmt = this.db.prepare('SELECT * FROM swaps WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) return null;

    return this.rowToSwap(row);
  }

  /**
   * Get swap by preimage hash
   */
  getSwapByPreimageHash(preimageHash: string): Swap | null {
    const stmt = this.db.prepare('SELECT * FROM swaps WHERE preimageHash = ?');
    const row = stmt.get(preimageHash) as any;

    if (!row) return null;

    return this.rowToSwap(row);
  }

  /**
   * Update swap
   */
  updateSwap(id: string, updates: Partial<Swap>): void {
    const fields: string[] = [];
    const values: any[] = [];

    // Always update timestamp
    fields.push('updatedAt = ?');
    values.push(Date.now());

    // Add other fields
    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'id' || key === 'createdAt' || key === 'updatedAt') return;

      if (key === 'invoicePaid') {
        fields.push(`${key} = ?`);
        values.push(value ? 1 : 0);
      } else {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE swaps SET ${fields.join(', ')} WHERE id = ?
    `);

    stmt.run(...values);
  }

  /**
   * Get all swaps with optional status filter
   */
  getAllSwaps(status?: SwapStatus): Swap[] {
    let stmt;
    let rows;

    if (status) {
      stmt = this.db.prepare('SELECT * FROM swaps WHERE status = ? ORDER BY createdAt DESC');
      rows = stmt.all(status) as any[];
    } else {
      stmt = this.db.prepare('SELECT * FROM swaps ORDER BY createdAt DESC');
      rows = stmt.all() as any[];
    }

    return rows.map(row => this.rowToSwap(row));
  }

  /**
   * Get swaps that need processing (pending, invoice_paid)
   */
  getPendingSwaps(): Swap[] {
    const stmt = this.db.prepare(`
      SELECT * FROM swaps
      WHERE status IN (?, ?)
      ORDER BY createdAt ASC
    `);

    const rows = stmt.all(SwapStatus.PENDING, SwapStatus.INVOICE_PAID) as any[];
    return rows.map(row => this.rowToSwap(row));
  }

  /**
   * Delete swap
   */
  deleteSwap(id: string): void {
    const stmt = this.db.prepare('DELETE FROM swaps WHERE id = ?');
    stmt.run(id);
  }

  /**
   * Convert database row to Swap object
   */
  private rowToSwap(row: any): Swap {
    return {
      id: row.id,
      status: row.status as SwapStatus,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      preimage: row.preimage,
      preimageHash: row.preimageHash,
      claimPrivateKey: row.claimPrivateKey,
      claimPublicKey: row.claimPublicKey,
      invoiceAmount: row.invoiceAmount,
      invoice: row.invoice,
      invoicePaid: row.invoicePaid === 1,
      lockupAddress: row.lockupAddress || undefined,
      lockupTxId: row.lockupTxId || undefined,
      lockupAmount: row.lockupAmount || undefined,
      timeoutBlockHeight: row.timeoutBlockHeight,
      claimAddress: row.claimAddress,
      claimTxId: row.claimTxId || undefined,
      claimedAt: row.claimedAt || undefined
    };
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}
