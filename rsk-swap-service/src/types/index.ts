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
  preimageHash: string;
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
  preimage?: string;  // Only populated AFTER user claims (extracted from chain)
}

export interface CreateSwapRequest {
  invoiceAmount: number;
  preimageHash: string;  // User-supplied preimage hash (user keeps preimage secret!)
  claimPublicKey: string;  // User-supplied public key for claiming
  claimAddress: string;
}

export interface CreateSwapResponse {
  id: string;
  invoice: string;
  lockupAddress: string;
  timeoutBlockHeight: number;
  // Security: preimage and claimPrivateKey are NEVER exposed
  // User already has their own preimage and privateKey
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
