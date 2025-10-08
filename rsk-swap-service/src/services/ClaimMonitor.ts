import { RskService } from './RskService';
import { DatabaseService } from './DatabaseService';
import { LndService } from './LndService';
import { SwapStatus } from '../types';
import { ethers } from 'ethers';

/**
 * ClaimMonitor watches the RSK blockchain for Claim events
 * When a user claims RBTC, we extract the preimage and settle the Lightning invoice
 */
export class ClaimMonitor {
  private isRunning = false;

  constructor(
    private rskService: RskService,
    private lndService: LndService,
    private dbService: DatabaseService
  ) {}

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
  private async monitorClaimEvents() {
    // Get all pending swaps that are locked (waiting for user to claim)
    const swaps = this.dbService.getAllSwaps();
    const lockedSwaps = swaps.filter(s => s.status === SwapStatus.LOCKED);

    console.log(`Monitoring ${lockedSwaps.length} locked swaps...`);

    // For each locked swap, listen for Claim event
    for (const swap of lockedSwaps) {
      this.watchSwapClaim(swap.id, swap.preimageHash);
    }
  }

  /**
   * Watch for a specific swap to be claimed
   */
  private async watchSwapClaim(swapId: string, preimageHash: string) {
    try {
      console.log(`Watching for claim of swap ${swapId}...`);

      // Poll for claim transaction (in production, use event listeners)
      const checkInterval = setInterval(async () => {
        const swap = this.dbService.getSwap(swapId);

        if (!swap || swap.status !== SwapStatus.LOCKED) {
          clearInterval(checkInterval);
          return;
        }

        // Check if claim transaction exists
        const claimTx = await this.findClaimTransaction(preimageHash);

        if (claimTx) {
          clearInterval(checkInterval);
          await this.handleClaim(swapId, claimTx.preimage, claimTx.txHash);
        }
      }, 10000); // Check every 10 seconds

    } catch (error) {
      console.error(`Error watching swap ${swapId}:`, error);
    }
  }

  /**
   * Find claim transaction for a given preimage hash
   * Returns the preimage revealed in the claim
   */
  private async findClaimTransaction(preimageHash: string): Promise<{preimage: string, txHash: string} | null> {
    // TODO: Implement proper blockchain scanning
    // For now, this is a placeholder that would need to:
    // 1. Query EtherSwap contract Claim events
    // 2. Filter by preimageHash
    // 3. Extract preimage from event data

    // Example implementation (needs actual contract event parsing):
    // const filter = etherSwapContract.filters.Claim(preimageHash);
    // const events = await etherSwapContract.queryFilter(filter);
    // if (events.length > 0) {
    //   return {
    //     preimage: events[0].args.preimage,
    //     txHash: events[0].transactionHash
    //   };
    // }

    return null;
  }

  /**
   * Handle a claim event
   * Extract preimage and settle Lightning invoice
   */
  private async handleClaim(swapId: string, preimage: string, claimTxHash: string) {
    try {
      console.log(`✅ Swap ${swapId} claimed! Preimage revealed: ${preimage}`);

      // Update swap status
      this.dbService.updateSwap(swapId, {
        status: SwapStatus.CLAIMED,
        claimTxId: claimTxHash,
        claimedAt: Date.now(),
        preimage: preimage  // Store preimage after it's revealed
      });

      // Settle Lightning invoice with revealed preimage
      await this.settleInvoice(swapId, preimage);

      console.log(`🎉 Swap ${swapId} completed successfully!`);

    } catch (error) {
      console.error(`Error handling claim for swap ${swapId}:`, error);
      this.dbService.updateSwap(swapId, { status: SwapStatus.FAILED });
    }
  }

  /**
   * Settle Lightning invoice with preimage
   */
  private async settleInvoice(swapId: string, preimage: string) {
    try {
      const swap = this.dbService.getSwap(swapId);
      if (!swap) {
        throw new Error(`Swap ${swapId} not found`);
      }

      console.log(`Settling Lightning invoice for swap ${swapId}...`);

      // Settle HODL invoice with preimage
      await this.lndService.settleInvoice(preimage);

      console.log(`Lightning invoice settled for swap ${swapId}`);

    } catch (error) {
      console.error(`Failed to settle invoice for swap ${swapId}:`, error);
      throw error;
    }
  }
}
