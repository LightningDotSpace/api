import { Swap, SwapStatus } from '../types';
export declare class DatabaseService {
    private db;
    constructor(dbPath: string);
    private initializeSchema;
    /**
     * Create a new swap
     */
    createSwap(swap: Swap): void;
    /**
     * Get swap by ID
     */
    getSwap(id: string): Swap | null;
    /**
     * Get swap by preimage hash
     */
    getSwapByPreimageHash(preimageHash: string): Swap | null;
    /**
     * Update swap
     */
    updateSwap(id: string, updates: Partial<Swap>): void;
    /**
     * Get all swaps with optional status filter
     */
    getAllSwaps(status?: SwapStatus): Swap[];
    /**
     * Get swaps that need processing (pending, invoice_paid)
     */
    getPendingSwaps(): Swap[];
    /**
     * Delete swap
     */
    deleteSwap(id: string): void;
    /**
     * Convert database row to Swap object
     */
    private rowToSwap;
    /**
     * Close database connection
     */
    close(): void;
}
//# sourceMappingURL=DatabaseService.d.ts.map