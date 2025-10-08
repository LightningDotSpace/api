import { ethers } from 'ethers';
import { randomBytes, createHash } from 'crypto';

// EtherSwap ABI (simplified - only functions we need)
const ETHERSWAP_ABI = [
  'function lockPrepayMinerfee(bytes32 preimageHash, address claimAddress, uint256 timelock, uint256 prepayAmount) external payable',
  'function lock(bytes32 preimageHash, address claimAddress, uint256 timelock) external payable',
  'function claim(bytes32 preimage, uint256 amount, address refundAddress, uint256 timelock) external',
  'function refund(bytes32 preimageHash, uint256 amount, address claimAddress, uint256 timelock) external',
  'event Lockup(bytes32 indexed preimageHash, uint256 amount, address claimAddress, address indexed refundAddress, uint256 timelock)',
  'event Claim(bytes32 indexed preimageHash, bytes32 preimage)',
  'event Refund(bytes32 indexed preimageHash)'
];

export interface LockupDetails {
  txHash: string;
  amount: bigint;
  timeoutBlockHeight: number;
}

export class RskService {
  private provider: ethers.Provider;
  private wallet: ethers.Wallet;
  private etherSwapContract: ethers.Contract;
  private readonly chainId: number;

  constructor(
    rpcUrl: string,
    privateKey: string,
    etherSwapAddress: string,
    chainId: number = 30
  ) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    this.etherSwapContract = new ethers.Contract(
      etherSwapAddress,
      ETHERSWAP_ABI,
      this.wallet
    );
    this.chainId = chainId;

    console.log(`RSK Service initialized for Chain ID ${chainId}`);
    console.log(`Wallet address: ${this.wallet.address}`);
  }

  /**
   * Lock RBTC in EtherSwap contract
   */
  async lockup(
    preimageHash: string,
    claimAddress: string,
    amountSats: number,
    timeoutBlocks: number = 1440
  ): Promise<LockupDetails> {
    try {
      // Convert sats to Wei (1 sat = 10^10 wei, since 1 BTC = 10^8 sats and 1 BTC = 10^18 wei)
      const amountWei = BigInt(amountSats) * BigInt(10 ** 10);

      // Get current block number
      const currentBlock = await this.provider.getBlockNumber();
      const timeoutBlockHeight = currentBlock + timeoutBlocks;

      console.log(`Locking ${amountSats} sats (${amountWei} wei) on RSK`);
      console.log(`Preimage Hash: ${preimageHash}`);
      console.log(`Claim Address: ${claimAddress}`);
      console.log(`Timeout Block: ${timeoutBlockHeight}`);

      // Ensure preimageHash is correctly formatted (0x prefix, 32 bytes)
      const formattedHash = preimageHash.startsWith('0x')
        ? preimageHash
        : `0x${preimageHash}`;

      // Call lock function
      const tx = await this.etherSwapContract.lock(
        formattedHash,
        claimAddress,
        timeoutBlockHeight,
        { value: amountWei }
      );

      console.log(`Lock transaction sent: ${tx.hash}`);

      // Wait for confirmation
      const receipt = await tx.wait();
      console.log(`Lock transaction confirmed in block ${receipt.blockNumber}`);

      return {
        txHash: tx.hash,
        amount: amountWei,
        timeoutBlockHeight
      };
    } catch (error) {
      console.error('Lockup failed:', error);
      throw new Error(`Failed to lock RBTC: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get wallet balance in sats
   */
  async getBalance(): Promise<number> {
    const balanceWei = await this.provider.getBalance(this.wallet.address);
    const balanceSats = Number(balanceWei / BigInt(10 ** 10));
    return balanceSats;
  }

  /**
   * Get current block number
   */
  async getCurrentBlock(): Promise<number> {
    return await this.provider.getBlockNumber();
  }

  /**
   * Monitor for Lockup event
   */
  async waitForLockup(preimageHash: string, timeoutMs: number = 300000): Promise<LockupDetails | null> {
    const formattedHash = preimageHash.startsWith('0x') ? preimageHash : `0x${preimageHash}`;

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.etherSwapContract.removeAllListeners('Lockup');
        resolve(null);
      }, timeoutMs);

      this.etherSwapContract.on('Lockup', async (pHash, amount, claimAddr, refundAddr, timelock, event) => {
        if (pHash.toLowerCase() === formattedHash.toLowerCase()) {
          clearTimeout(timeout);
          this.etherSwapContract.removeAllListeners('Lockup');

          resolve({
            txHash: event.log.transactionHash,
            amount: amount,
            timeoutBlockHeight: Number(timelock)
          });
        }
      });
    });
  }

  /**
   * Get wallet address
   */
  getAddress(): string {
    return this.wallet.address;
  }

  /**
   * Get transaction receipt
   */
  async getTransaction(txHash: string) {
    return await this.provider.getTransaction(txHash);
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(txHash: string) {
    return await this.provider.getTransactionReceipt(txHash);
  }

  /**
   * Query Claim events for a specific preimageHash
   * Returns the preimage revealed in the claim transaction
   */
  async findClaimEvent(preimageHash: string, fromBlock: number = -1000): Promise<{preimage: string, txHash: string} | null> {
    try {
      const formattedHash = preimageHash.startsWith('0x') ? preimageHash : `0x${preimageHash}`;

      // Create filter for Claim events with our preimageHash
      const filter = this.etherSwapContract.filters.Claim(formattedHash);

      // Query events from the last N blocks to current
      const currentBlock = await this.provider.getBlockNumber();
      const searchFromBlock = fromBlock < 0 ? currentBlock + fromBlock : fromBlock;

      console.log(`Searching for Claim event from block ${searchFromBlock} to ${currentBlock}`);

      const events = await this.etherSwapContract.queryFilter(filter, searchFromBlock, currentBlock);

      if (events.length > 0) {
        const event = events[0] as ethers.EventLog;
        console.log(`Found Claim event in tx ${event.transactionHash}`);

        return {
          preimage: event.args.preimage,
          txHash: event.transactionHash
        };
      }

      return null;
    } catch (error) {
      console.error('Error querying Claim events:', error);
      return null;
    }
  }

  /**
   * Listen for Claim events in real-time
   */
  onClaimEvent(preimageHash: string, callback: (preimage: string, txHash: string) => void): () => void {
    const formattedHash = preimageHash.startsWith('0x') ? preimageHash : `0x${preimageHash}`;

    const listener = async (pHash: string, preimage: string, event: any) => {
      if (pHash.toLowerCase() === formattedHash.toLowerCase()) {
        console.log(`Claim event detected for ${preimageHash} in tx ${event.log.transactionHash}`);
        callback(preimage, event.log.transactionHash);
      }
    };

    // Start listening
    this.etherSwapContract.on('Claim', listener);

    // Return cleanup function
    return () => {
      this.etherSwapContract.off('Claim', listener);
    };
  }

  /**
   * Get EtherSwap contract (for advanced usage)
   */
  getEtherSwapContract(): ethers.Contract {
    return this.etherSwapContract;
  }
}

/**
 * Utility functions for crypto operations
 */
export class CryptoUtils {
  /**
   * Generate random preimage (32 bytes)
   */
  static generatePreimage(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Calculate SHA256 hash of preimage
   */
  static hashPreimage(preimage: string): string {
    const preimageBuffer = Buffer.from(preimage, 'hex');
    return createHash('sha256').update(preimageBuffer).digest('hex');
  }

  /**
   * Generate random keypair for HTLC
   */
  static generateKeypair() {
    const privateKey = randomBytes(32).toString('hex');
    const wallet = new ethers.Wallet(privateKey);

    return {
      privateKey,
      publicKey: wallet.address
    };
  }
}
