"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSwapRoutes = createSwapRoutes;
const express_1 = require("express");
function createSwapRoutes(swapManager) {
    const router = (0, express_1.Router)();
    /**
     * POST /api/swaps/reverse
     * Create a new reverse swap (Lightning � RBTC)
     */
    router.post('/reverse', async (req, res) => {
        try {
            const request = req.body;
            // Validate required fields
            if (!request.invoiceAmount || !request.claimAddress || !request.preimageHash) {
                return res.status(400).json({
                    error: 'Missing required fields: invoiceAmount, preimageHash, claimAddress'
                });
            }
            // Validate preimageHash format (must be 64 hex characters = 32 bytes)
            if (!/^[0-9a-fA-F]{64}$/.test(request.preimageHash)) {
                return res.status(400).json({
                    error: 'Invalid preimageHash: must be 64 hexadecimal characters (32 bytes)'
                });
            }
            // Note: claimPublicKey can be Bitcoin public key (66 hex) or Ethereum address (0x + 40 hex)
            // We don't validate format since it will be auto-generated if not provided
            if (request.invoiceAmount < 10000) {
                return res.status(400).json({
                    error: 'Minimum invoice amount is 10,000 sats'
                });
            }
            // Create swap
            const swap = await swapManager.createReverseSwap(request);
            res.json(swap);
        }
        catch (error) {
            console.error('Error creating reverse swap:', error);
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Failed to create swap'
            });
        }
    });
    /**
     * GET /api/swaps/:id
     * Get swap status by ID
     */
    router.get('/:id', (req, res) => {
        try {
            const { id } = req.params;
            const swap = swapManager.getSwapStatus(id);
            if (!swap) {
                return res.status(404).json({ error: 'Swap not found' });
            }
            const response = {
                id: swap.id,
                status: swap.status,
                invoice: swap.invoice,
                invoicePaid: swap.invoicePaid,
                lockupTxId: swap.lockupTxId,
                lockupAddress: swap.lockupAddress,
                lockupAmount: swap.lockupAmount,
                claimTxId: swap.claimTxId,
                timeoutBlockHeight: swap.timeoutBlockHeight
            };
            res.json(response);
        }
        catch (error) {
            console.error('Error getting swap status:', error);
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Failed to get swap status'
            });
        }
    });
    /**
     * GET /api/swaps
     * Get all swaps
     */
    router.get('/', (req, res) => {
        try {
            const swaps = swapManager.getAllSwaps();
            const response = swaps.map(swap => ({
                id: swap.id,
                status: swap.status,
                invoiceAmount: swap.invoiceAmount,
                lockupAmount: swap.lockupAmount,
                createdAt: swap.createdAt,
                lockupTxId: swap.lockupTxId
            }));
            res.json(response);
        }
        catch (error) {
            console.error('Error getting swaps:', error);
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Failed to get swaps'
            });
        }
    });
    /**
     * GET /api/health
     * Health check endpoint
     */
    router.get('/health', (req, res) => {
        res.json({ status: 'ok', service: 'rsk-swap-service' });
    });
    return router;
}
//# sourceMappingURL=swap.routes.js.map