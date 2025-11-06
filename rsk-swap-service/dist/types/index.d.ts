export declare enum SwapStatus {
    PENDING = "pending",
    INVOICE_PAID = "invoice_paid",
    LOCKED = "locked",
    CLAIMED = "claimed",
    REFUNDED = "refunded",
    EXPIRED = "expired",
    FAILED = "failed"
}
export interface Swap {
    id: string;
    status: SwapStatus;
    createdAt: number;
    updatedAt: number;
    preimageHash: string;
    claimPublicKey: string;
    invoiceAmount: number;
    invoice: string;
    invoicePaid: boolean;
    lockupAddress?: string;
    lockupTxId?: string;
    lockupAmount?: number;
    timeoutBlockHeight: number;
    claimAddress: string;
    claimTxId?: string;
    claimedAt?: number;
    preimage?: string;
}
export interface CreateSwapRequest {
    invoiceAmount: number;
    preimageHash: string;
    claimPublicKey: string;
    claimAddress: string;
}
export interface CreateSwapResponse {
    id: string;
    invoice: string;
    lockupAddress: string;
    timeoutBlockHeight: number;
    claimPublicKey: string;
    onchainAmount: number;
}
export interface SwapStatusResponse {
    id: string;
    status: SwapStatus;
    invoice?: string;
    invoicePaid: boolean;
    lockupTxId?: string;
    lockupAddress?: string;
    lockupAmount?: number;
    claimTxId?: string;
    timeoutBlockHeight: number;
}
//# sourceMappingURL=index.d.ts.map