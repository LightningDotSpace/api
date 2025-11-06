import { RskService } from './RskService';
import { LndService } from './LndService';
import { DatabaseService } from './DatabaseService';
import { Swap, CreateSwapRequest, CreateSwapResponse } from '../types';
export declare class SwapManager {
    private rskService;
    private lndService;
    private dbService;
    constructor(rskService: RskService, lndService: LndService, dbService: DatabaseService);
    /**
     * Create a new reverse swap (Lightning → RBTC)
     * User provides: preimageHash, claimPublicKey (keeps preimage secret!)
     */
    createReverseSwap(request: CreateSwapRequest): Promise<CreateSwapResponse>;
    /**
     * Monitor invoice payment and trigger lockup
     */
    private monitorInvoicePayment;
    /**
     * Perform RBTC lockup on RSK
     */
    private performLockup;
    /**
     * Get swap status
     */
    getSwapStatus(swapId: string): Swap | null;
    /**
     * Get all swaps
     */
    getAllSwaps(): Swap[];
}
//# sourceMappingURL=SwapManager.d.ts.map