"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const types_1 = require("../types");
class DatabaseService {
    constructor(dbPath) {
        this.db = new better_sqlite3_1.default(dbPath);
        this.initializeSchema();
        console.log(`Database initialized at ${dbPath}`);
    }
    initializeSchema() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS swaps (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL,

        preimage TEXT,
        preimageHash TEXT NOT NULL,
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
    createSwap(swap) {
        const stmt = this.db.prepare(`
      INSERT INTO swaps (
        id, status, createdAt, updatedAt,
        preimage, preimageHash, claimPublicKey,
        invoiceAmount, invoice, invoicePaid,
        lockupAddress, lockupTxId, lockupAmount, timeoutBlockHeight, claimAddress,
        claimTxId, claimedAt
      ) VALUES (
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?
      )
    `);
        stmt.run(swap.id, swap.status, swap.createdAt, swap.updatedAt, swap.preimage || null, swap.preimageHash, swap.claimPublicKey, swap.invoiceAmount, swap.invoice, swap.invoicePaid ? 1 : 0, swap.lockupAddress || null, swap.lockupTxId || null, swap.lockupAmount || null, swap.timeoutBlockHeight, swap.claimAddress, swap.claimTxId || null, swap.claimedAt || null);
    }
    /**
     * Get swap by ID
     */
    getSwap(id) {
        const stmt = this.db.prepare('SELECT * FROM swaps WHERE id = ?');
        const row = stmt.get(id);
        if (!row)
            return null;
        return this.rowToSwap(row);
    }
    /**
     * Get swap by preimage hash
     */
    getSwapByPreimageHash(preimageHash) {
        const stmt = this.db.prepare('SELECT * FROM swaps WHERE preimageHash = ?');
        const row = stmt.get(preimageHash);
        if (!row)
            return null;
        return this.rowToSwap(row);
    }
    /**
     * Update swap
     */
    updateSwap(id, updates) {
        const fields = [];
        const values = [];
        // Always update timestamp
        fields.push('updatedAt = ?');
        values.push(Date.now());
        // Add other fields
        Object.entries(updates).forEach(([key, value]) => {
            if (key === 'id' || key === 'createdAt' || key === 'updatedAt')
                return;
            if (key === 'invoicePaid') {
                fields.push(`${key} = ?`);
                values.push(value ? 1 : 0);
            }
            else {
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
    getAllSwaps(status) {
        let stmt;
        let rows;
        if (status) {
            stmt = this.db.prepare('SELECT * FROM swaps WHERE status = ? ORDER BY createdAt DESC');
            rows = stmt.all(status);
        }
        else {
            stmt = this.db.prepare('SELECT * FROM swaps ORDER BY createdAt DESC');
            rows = stmt.all();
        }
        return rows.map(row => this.rowToSwap(row));
    }
    /**
     * Get swaps that need processing (pending, invoice_paid)
     */
    getPendingSwaps() {
        const stmt = this.db.prepare(`
      SELECT * FROM swaps
      WHERE status IN (?, ?)
      ORDER BY createdAt ASC
    `);
        const rows = stmt.all(types_1.SwapStatus.PENDING, types_1.SwapStatus.INVOICE_PAID);
        return rows.map(row => this.rowToSwap(row));
    }
    /**
     * Delete swap
     */
    deleteSwap(id) {
        const stmt = this.db.prepare('DELETE FROM swaps WHERE id = ?');
        stmt.run(id);
    }
    /**
     * Convert database row to Swap object
     */
    rowToSwap(row) {
        return {
            id: row.id,
            status: row.status,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            preimage: row.preimage || undefined,
            preimageHash: row.preimageHash,
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
    close() {
        this.db.close();
    }
}
exports.DatabaseService = DatabaseService;
//# sourceMappingURL=DatabaseService.js.map