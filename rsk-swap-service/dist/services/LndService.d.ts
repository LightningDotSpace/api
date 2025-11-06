export interface LndConfig {
    host: string;
    macaroonPath: string;
    tlsCertPath: string;
}
export interface Invoice {
    paymentRequest: string;
    paymentHash: string;
    isPaid: boolean;
    amountSats: number;
}
export declare class LndService {
    private config;
    private lnd;
    private isConnected;
    constructor(config: LndConfig);
    /**
     * Connect to LND
     */
    connect(): Promise<void>;
    /**
     * Create a Hold Lightning invoice (HTLC with preimage hash)
     */
    createInvoice(amountSats: number, preimageHash: string, memo?: string): Promise<Invoice>;
    /**
     * Wait for invoice to be paid
     */
    waitForInvoicePayment(paymentHash: string, timeoutMs?: number): Promise<boolean>;
    /**
     * Check if invoice is paid (one-time check)
     */
    isInvoicePaid(paymentHash: string): Promise<boolean>;
    /**
     * Settle a HODL invoice with preimage
     * Called when user claims onchain and reveals preimage
     */
    settleInvoice(preimage: string): Promise<void>;
    /**
     * Disconnect from LND
     */
    disconnect(): void;
}
//# sourceMappingURL=LndService.d.ts.map