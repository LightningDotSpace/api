import { RskService, CryptoUtils } from './RskService';
import { LndService } from './LndService';
import { DatabaseService } from './DatabaseService';
import { Swap, SwapStatus, CreateSwapRequest, CreateSwapResponse } from '../types';
import { randomBytes } from 'crypto';

export class SwapManager {
  constructor(
    private rskService: RskService,
    private lndService: LndService,
    private dbService: DatabaseService
  ) {}

  /**
   * Create a new reverse swap (Lightning → RBTC)
   * User provides: preimageHash, claimPublicKey (keeps preimage secret!)
   */
  async createReverseSwap(request: CreateSwapRequest): Promise<CreateSwapResponse> {
    const swapId = randomBytes(6).toString('base64url');
    const timeoutBlockHeight = await this.rskService.getCurrentBlock() + 1440; // 24 hours

    // Validate inputs
    if (!request.preimageHash || request.preimageHash.length !== 64) {
      throw new Error('Invalid preimageHash: must be 32 bytes (64 hex chars)');
    }

    // Create HODL invoice (settled when preimage revealed)
    const invoice = await this.lndService.createInvoice(
      request.invoiceAmount,
      request.preimageHash,
      `Lightning.space RSK Swap ${swapId}`
    );

    // Save swap to database (NO preimage, NO privateKey stored!)
    const swap: Swap = {
      id: swapId,
      status: SwapStatus.PENDING,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      preimageHash: request.preimageHash,
      claimPublicKey: request.claimPublicKey,
      invoiceAmount: request.invoiceAmount,
      invoice: invoice.paymentRequest,
      invoicePaid: false,
      timeoutBlockHeight,
      claimAddress: request.claimAddress
    };

    this.dbService.createSwap(swap);

    // Start monitoring invoice payment
    this.monitorInvoicePayment(swapId, request.preimageHash);

    console.log(`Created swap ${swapId}: ${request.invoiceAmount} sats`);
    console.log(`Security: User keeps preimage secret until claim`);

    return {
      id: swapId,
      invoice: invoice.paymentRequest,
      lockupAddress: this.rskService.getAddress(),
      timeoutBlockHeight
    };
  }

  /**
   * Monitor invoice payment and trigger lockup
   */
  private async monitorInvoicePayment(swapId: string, preimageHash: string): Promise<void> {
    try {
      console.log(`Monitoring invoice payment for swap ${swapId}...`);

      const isPaid = await this.lndService.waitForInvoicePayment(preimageHash, 3600000); // 1 hour

      if (!isPaid) {
        console.log(`Invoice not paid for swap ${swapId}, marking as expired`);
        this.dbService.updateSwap(swapId, { status: SwapStatus.EXPIRED });
        return;
      }

      console.log(`Invoice paid for swap ${swapId}! Creating lockup...`);
      this.dbService.updateSwap(swapId, {
        status: SwapStatus.INVOICE_PAID,
        invoicePaid: true
      });

      // Trigger lockup
      await this.performLockup(swapId);

    } catch (error) {
      console.error(`Error monitoring invoice for swap ${swapId}:`, error);
      this.dbService.updateSwap(swapId, { status: SwapStatus.FAILED });
    }
  }

  /**
   * Perform RBTC lockup on RSK
   */
  private async performLockup(swapId: string): Promise<void> {
    try {
      const swap = this.dbService.getSwap(swapId);
      if (!swap) {
        throw new Error(`Swap ${swapId} not found`);
      }

      console.log(`Locking RBTC for swap ${swapId}...`);

      // Calculate onchain amount (minus fees)
      const feePercent = 0.005; // 0.5% fee
      const onchainAmount = Math.floor(swap.invoiceAmount * (1 - feePercent));

      // Lock RBTC (user will claim with their preimage)
      const lockupDetails = await this.rskService.lockup(
        swap.preimageHash,
        swap.claimAddress,  // User claims to their address
        onchainAmount,
        1440 // 24 hours
      );

      // Update swap
      this.dbService.updateSwap(swapId, {
        status: SwapStatus.LOCKED,
        lockupTxId: lockupDetails.txHash,
        lockupAmount: onchainAmount,
        timeoutBlockHeight: lockupDetails.timeoutBlockHeight
      });

      console.log(`Lockup complete for swap ${swapId}: ${lockupDetails.txHash}`);

    } catch (error) {
      console.error(`Lockup failed for swap ${swapId}:`, error);
      this.dbService.updateSwap(swapId, { status: SwapStatus.FAILED });
    }
  }

  /**
   * Get swap status
   */
  getSwapStatus(swapId: string): Swap | null {
    return this.dbService.getSwap(swapId);
  }

  /**
   * Get all swaps
   */
  getAllSwaps(): Swap[] {
    return this.dbService.getAllSwaps();
  }
}
