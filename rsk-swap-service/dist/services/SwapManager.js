"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SwapManager = void 0;
const types_1 = require("../types");
const crypto_1 = require("crypto");
class SwapManager {
    constructor(rskService, lndService, dbService) {
        this.rskService = rskService;
        this.lndService = lndService;
        this.dbService = dbService;
    }
    /**
     * Create a new reverse swap (Lightning → RBTC)
     * User provides: preimageHash, claimPublicKey (keeps preimage secret!)
     */
    async createReverseSwap(request) {
        const swapId = (0, crypto_1.randomBytes)(6).toString('base64url');
        const timeoutBlockHeight = await this.rskService.getCurrentBlock() + 1440; // 24 hours
        // Validate inputs
        if (!request.preimageHash || request.preimageHash.length !== 64) {
            throw new Error('Invalid preimageHash: must be 32 bytes (64 hex chars)');
        }
        // Create HODL invoice (settled when preimage revealed)
        const invoice = await this.lndService.createInvoice(request.invoiceAmount, request.preimageHash, `Lightning.space RSK Swap ${swapId}`);
        // Save swap to database (NO preimage, NO privateKey stored!)
        const swap = {
            id: swapId,
            status: types_1.SwapStatus.PENDING,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            preimageHash: request.preimageHash,
            claimPublicKey: request.claimPublicKey || this.rskService.getAddress(), // Use service wallet if not provided
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
        // Calculate onchain amount (minus fees)
        const feePercent = 0.005; // 0.5% fee
        const onchainAmount = Math.floor(request.invoiceAmount * (1 - feePercent));
        return {
            id: swapId,
            invoice: invoice.paymentRequest,
            lockupAddress: this.rskService.getAddress(),
            timeoutBlockHeight,
            claimPublicKey: swap.claimPublicKey,
            onchainAmount
        };
    }
    /**
     * Monitor invoice payment and trigger lockup
     */
    async monitorInvoicePayment(swapId, preimageHash) {
        try {
            console.log(`Monitoring invoice payment for swap ${swapId}...`);
            const isPaid = await this.lndService.waitForInvoicePayment(preimageHash, 3600000); // 1 hour
            if (!isPaid) {
                console.log(`Invoice not paid for swap ${swapId}, marking as expired`);
                this.dbService.updateSwap(swapId, { status: types_1.SwapStatus.EXPIRED });
                return;
            }
            console.log(`Invoice paid for swap ${swapId}! Creating lockup...`);
            this.dbService.updateSwap(swapId, {
                status: types_1.SwapStatus.INVOICE_PAID,
                invoicePaid: true
            });
            // Trigger lockup
            await this.performLockup(swapId);
        }
        catch (error) {
            console.error(`Error monitoring invoice for swap ${swapId}:`, error);
            this.dbService.updateSwap(swapId, { status: types_1.SwapStatus.FAILED });
        }
    }
    /**
     * Perform RBTC lockup on RSK
     */
    async performLockup(swapId) {
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
            const lockupDetails = await this.rskService.lockup(swap.preimageHash, swap.claimAddress, // User claims to their address
            onchainAmount, 1440 // 24 hours
            );
            // Update swap
            this.dbService.updateSwap(swapId, {
                status: types_1.SwapStatus.LOCKED,
                lockupTxId: lockupDetails.txHash,
                lockupAmount: onchainAmount,
                timeoutBlockHeight: lockupDetails.timeoutBlockHeight
            });
            console.log(`Lockup complete for swap ${swapId}: ${lockupDetails.txHash}`);
        }
        catch (error) {
            console.error(`Lockup failed for swap ${swapId}:`, error);
            this.dbService.updateSwap(swapId, { status: types_1.SwapStatus.FAILED });
        }
    }
    /**
     * Get swap status
     */
    getSwapStatus(swapId) {
        return this.dbService.getSwap(swapId);
    }
    /**
     * Get all swaps
     */
    getAllSwaps() {
        return this.dbService.getAllSwaps();
    }
}
exports.SwapManager = SwapManager;
//# sourceMappingURL=SwapManager.js.map