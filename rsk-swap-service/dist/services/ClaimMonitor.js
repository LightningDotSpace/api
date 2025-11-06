"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaimMonitor = void 0;
const types_1 = require("../types");
/**
 * ClaimMonitor watches the RSK blockchain for Claim events
 * When a user claims RBTC, we extract the preimage and settle the Lightning invoice
 */
class ClaimMonitor {
    constructor(rskService, lndService, dbService) {
        this.rskService = rskService;
        this.lndService = lndService;
        this.dbService = dbService;
        this.isRunning = false;
    }
    /**
     * Start monitoring for claims
     */
    start() {
        if (this.isRunning) {
            console.log('ClaimMonitor already running');
            return;
        }
        this.isRunning = true;
        console.log('🔍 ClaimMonitor started - watching for onchain claims...');
        // Monitor Claim events from EtherSwap contract
        this.monitorClaimEvents();
    }
    /**
     * Stop monitoring
     */
    stop() {
        this.isRunning = false;
        console.log('ClaimMonitor stopped');
    }
    /**
     * Monitor blockchain for Claim events
     */
    async monitorClaimEvents() {
        // Get all pending swaps that are locked (waiting for user to claim)
        const swaps = this.dbService.getAllSwaps();
        const lockedSwaps = swaps.filter(s => s.status === types_1.SwapStatus.LOCKED);
        console.log(`Monitoring ${lockedSwaps.length} locked swaps...`);
        // For each locked swap, listen for Claim event
        for (const swap of lockedSwaps) {
            this.watchSwapClaim(swap.id, swap.preimageHash);
        }
    }
    /**
     * Watch for a specific swap to be claimed
     * Uses real-time event listening for instant detection
     */
    async watchSwapClaim(swapId, preimageHash) {
        try {
            console.log(`Watching for claim of swap ${swapId}...`);
            // First, check if already claimed (historical event)
            const existingClaim = await this.findClaimTransaction(preimageHash);
            if (existingClaim) {
                await this.handleClaim(swapId, existingClaim.preimage, existingClaim.txHash);
                return;
            }
            // Setup real-time event listener
            const cleanup = this.rskService.onClaimEvent(preimageHash, async (preimage, txHash) => {
                console.log(`Real-time claim detected for swap ${swapId}!`);
                cleanup(); // Stop listening
                await this.handleClaim(swapId, preimage, txHash);
            });
            // Fallback: Poll every 30 seconds as backup (in case WebSocket connection drops)
            const checkInterval = setInterval(async () => {
                const swap = this.dbService.getSwap(swapId);
                if (!swap || swap.status !== types_1.SwapStatus.LOCKED) {
                    clearInterval(checkInterval);
                    cleanup(); // Stop event listener
                    return;
                }
                // Check if claim transaction exists (fallback)
                const claimTx = await this.findClaimTransaction(preimageHash);
                if (claimTx) {
                    clearInterval(checkInterval);
                    cleanup(); // Stop event listener
                    await this.handleClaim(swapId, claimTx.preimage, claimTx.txHash);
                }
            }, 30000); // Check every 30 seconds (fallback only)
        }
        catch (error) {
            console.error(`Error watching swap ${swapId}:`, error);
        }
    }
    /**
     * Find claim transaction for a given preimage hash
     * Returns the preimage revealed in the claim
     */
    async findClaimTransaction(preimageHash) {
        try {
            // Query EtherSwap contract for Claim events
            // Search the last 1000 blocks (approximately 8 hours on RSK with 30s blocks)
            const claimEvent = await this.rskService.findClaimEvent(preimageHash, -1000);
            if (claimEvent) {
                console.log(`Found claim for ${preimageHash}: preimage=${claimEvent.preimage.substring(0, 8)}...`);
                return claimEvent;
            }
            return null;
        }
        catch (error) {
            console.error(`Error finding claim transaction for ${preimageHash}:`, error);
            return null;
        }
    }
    /**
     * Handle a claim event
     * Extract preimage and settle Lightning invoice
     */
    async handleClaim(swapId, preimage, claimTxHash) {
        try {
            console.log(`✅ Swap ${swapId} claimed! Preimage revealed: ${preimage}`);
            // Update swap status
            this.dbService.updateSwap(swapId, {
                status: types_1.SwapStatus.CLAIMED,
                claimTxId: claimTxHash,
                claimedAt: Date.now(),
                preimage: preimage // Store preimage after it's revealed
            });
            // Settle Lightning invoice with revealed preimage
            await this.settleInvoice(swapId, preimage);
            console.log(`🎉 Swap ${swapId} completed successfully!`);
        }
        catch (error) {
            console.error(`Error handling claim for swap ${swapId}:`, error);
            this.dbService.updateSwap(swapId, { status: types_1.SwapStatus.FAILED });
        }
    }
    /**
     * Settle Lightning invoice with preimage
     */
    async settleInvoice(swapId, preimage) {
        try {
            const swap = this.dbService.getSwap(swapId);
            if (!swap) {
                throw new Error(`Swap ${swapId} not found`);
            }
            console.log(`Settling Lightning invoice for swap ${swapId}...`);
            // Settle HODL invoice with preimage
            await this.lndService.settleInvoice(preimage);
            console.log(`Lightning invoice settled for swap ${swapId}`);
        }
        catch (error) {
            console.error(`Failed to settle invoice for swap ${swapId}:`, error);
            throw error;
        }
    }
}
exports.ClaimMonitor = ClaimMonitor;
//# sourceMappingURL=ClaimMonitor.js.map