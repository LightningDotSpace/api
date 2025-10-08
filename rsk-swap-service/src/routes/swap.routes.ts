import { Router, Request, Response } from 'express';
import { SwapManager } from '../services/SwapManager';
import { CreateSwapRequest, SwapStatusResponse } from '../types';

export function createSwapRoutes(swapManager: SwapManager): Router {
  const router = Router();

  /**
   * POST /api/swaps/reverse
   * Create a new reverse swap (Lightning ’ RBTC)
   */
  router.post('/reverse', async (req: Request, res: Response) => {
    try {
      const request: CreateSwapRequest = req.body;

      // Validate request
      if (!request.invoiceAmount || !request.claimAddress) {
        return res.status(400).json({
          error: 'Missing required fields: invoiceAmount, claimAddress'
        });
      }

      if (request.invoiceAmount < 10000) {
        return res.status(400).json({
          error: 'Minimum invoice amount is 10,000 sats'
        });
      }

      // Create swap
      const swap = await swapManager.createReverseSwap(request);

      res.json(swap);
    } catch (error) {
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
  router.get('/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const swap = swapManager.getSwapStatus(id);

      if (!swap) {
        return res.status(404).json({ error: 'Swap not found' });
      }

      const response: SwapStatusResponse = {
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
    } catch (error) {
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
  router.get('/', (req: Request, res: Response) => {
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
    } catch (error) {
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
  router.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'rsk-swap-service' });
  });

  return router;
}
