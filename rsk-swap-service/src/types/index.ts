export enum SwapStatus {
  PENDING = 'pending',
  INVOICE_PAID = 'invoice_paid',
  LOCKED = 'locked',
  CLAIMED = 'claimed',
  REFUNDED = 'refunded',
  EXPIRED = 'expired',
  FAILED = 'failed'
}

export interface Swap {
  id: string;
  status: SwapStatus;
  createdAt: number;
  updatedAt: number;

  // Cryptographic
  preimage: string;
  preimageHash: string;
  claimPrivateKey: string;
  claimPublicKey: string;

  // Lightning
  invoiceAmount: number;
  invoice: string;
  invoicePaid: boolean;

  // OnChain
  lockupAddress?: string;
  lockupTxId?: string;
  lockupAmount?: number;
  timeoutBlockHeight: number;
  claimAddress: string;

  // Claimed
  claimTxId?: string;
  claimedAt?: number;
}

export interface CreateSwapRequest {
  invoiceAmount: number;
  claimAddress: string;
}

export interface CreateSwapResponse {
  id: string;
  invoice: string;
  preimageHash: string;
  claimPublicKey: string;
  timeoutBlockHeight: number;
  claimPrivateKey: string;
  preimage: string;
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
