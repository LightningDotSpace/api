import { ethers } from 'ethers';
export interface LockupDetails {
    txHash: string;
    amount: bigint;
    timeoutBlockHeight: number;
}
export declare class RskService {
    private provider;
    private wallet;
    private etherSwapContract;
    private readonly chainId;
    constructor(rpcUrl: string, privateKey: string, etherSwapAddress: string, chainId?: number);
    /**
     * Lock RBTC in EtherSwap contract
     */
    lockup(preimageHash: string, claimAddress: string, amountSats: number, timeoutBlocks?: number): Promise<LockupDetails>;
    /**
     * Get wallet balance in sats
     */
    getBalance(): Promise<number>;
    /**
     * Get current block number
     */
    getCurrentBlock(): Promise<number>;
    /**
     * Monitor for Lockup event
     */
    waitForLockup(preimageHash: string, timeoutMs?: number): Promise<LockupDetails | null>;
    /**
     * Get wallet address
     */
    getAddress(): string;
    /**
     * Get transaction receipt
     */
    getTransaction(txHash: string): Promise<ethers.TransactionResponse>;
    /**
     * Get transaction receipt
     */
    getTransactionReceipt(txHash: string): Promise<ethers.TransactionReceipt>;
    /**
     * Query Claim events for a specific preimageHash
     * Returns the preimage revealed in the claim transaction
     */
    findClaimEvent(preimageHash: string, fromBlock?: number): Promise<{
        preimage: string;
        txHash: string;
    } | null>;
    /**
     * Listen for Claim events in real-time
     */
    onClaimEvent(preimageHash: string, callback: (preimage: string, txHash: string) => void): () => void;
    /**
     * Get EtherSwap contract (for advanced usage)
     */
    getEtherSwapContract(): ethers.Contract;
}
/**
 * Utility functions for crypto operations
 */
export declare class CryptoUtils {
    /**
     * Generate random preimage (32 bytes)
     */
    static generatePreimage(): string;
    /**
     * Calculate SHA256 hash of preimage
     */
    static hashPreimage(preimage: string): string;
    /**
     * Generate random keypair for HTLC
     */
    static generateKeypair(): {
        privateKey: string;
        publicKey: string;
    };
}
//# sourceMappingURL=RskService.d.ts.map