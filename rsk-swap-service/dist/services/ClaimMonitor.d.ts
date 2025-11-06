import { RskService } from './RskService';
import { DatabaseService } from './DatabaseService';
import { LndService } from './LndService';
/**
 * ClaimMonitor watches the RSK blockchain for Claim events
 * When a user claims RBTC, we extract the preimage and settle the Lightning invoice
 */
export declare class ClaimMonitor {
    private rskService;
    private lndService;
    private dbService;
    private isRunning;
    constructor(rskService: RskService, lndService: LndService, dbService: DatabaseService);
    /**
     * Start monitoring for claims
     */
    start(): void;
    /**
     * Stop monitoring
     */
    stop(): void;
    /**
     * Monitor blockchain for Claim events
     */
    private monitorClaimEvents;
    /**
     * Watch for a specific swap to be claimed
     * Uses real-time event listening for instant detection
     */
    private watchSwapClaim;
    /**
     * Find claim transaction for a given preimage hash
     * Returns the preimage revealed in the claim
     */
    private findClaimTransaction;
    /**
     * Handle a claim event
     * Extract preimage and settle Lightning invoice
     */
    private handleClaim;
    /**
     * Settle Lightning invoice with preimage
     */
    private settleInvoice;
}
//# sourceMappingURL=ClaimMonitor.d.ts.map