/**
 * Security-focused integration tests for Reverse Swap
 * Tests the attack scenarios we identified
 */

import { SwapManager } from '../services/SwapManager';
import { RskService, CryptoUtils } from '../services/RskService';
import { LndService } from '../services/LndService';
import { DatabaseService } from '../services/DatabaseService';
import { CreateSwapRequest } from '../types';

describe('Reverse Swap Security Tests', () => {
  let swapManager: SwapManager;
  let rskService: RskService;
  let lndService: LndService;
  let dbService: DatabaseService;

  beforeAll(() => {
    // Initialize services (mock or test instances)
    rskService = new RskService(
      process.env.RSK_RPC_URL || 'http://localhost:4444',
      process.env.RSK_PRIVATE_KEY || '0x' + '0'.repeat(64),
      process.env.RSK_ETHERSWAP_ADDRESS || '0x' + '0'.repeat(40),
      31 // testnet
    );

    lndService = new LndService({
      host: process.env.LND_HOST || 'localhost:10009',
      macaroonPath: process.env.LND_MACAROON_PATH || '/path/to/admin.macaroon',
      tlsCertPath: process.env.LND_TLS_CERT_PATH || '/path/to/tls.cert'
    });

    dbService = new DatabaseService(':memory:');
    swapManager = new SwapManager(rskService, lndService, dbService);
  });

  describe('✅ Happy Path: Legitimate User', () => {
    it('should allow legitimate user to complete swap', async () => {
      // User generates their own preimage
      const userPreimage = CryptoUtils.generatePreimage();
      const userPreimageHash = CryptoUtils.hashPreimage(userPreimage);
      const { privateKey, publicKey } = CryptoUtils.generateKeypair();

      // User creates swap with THEIR preimageHash
      const request: CreateSwapRequest = {
        invoiceAmount: 10000,
        preimageHash: userPreimageHash,
        claimPublicKey: publicKey,
        claimAddress: '0x' + '1'.repeat(40)
      };

      const response = await swapManager.createReverseSwap(request);

      // Verify response does NOT contain secrets
      expect(response).not.toHaveProperty('preimage');
      expect(response).not.toHaveProperty('claimPrivateKey');
      expect(response).toHaveProperty('invoice');
      expect(response).toHaveProperty('lockupAddress');
      expect(response).toHaveProperty('timeoutBlockHeight');

      // User keeps preimage secret until they claim
      // After user pays invoice and claims onchain with preimage,
      // service extracts preimage from blockchain
      // This is the CORRECT flow
    });
  });

  describe('❌ Attack Scenario 1: Preimage Exposure (OLD VULNERABLE CODE)', () => {
    it('MUST NOT expose preimage in API response', async () => {
      const request: CreateSwapRequest = {
        invoiceAmount: 10000,
        preimageHash: CryptoUtils.hashPreimage(CryptoUtils.generatePreimage()),
        claimPublicKey: '0x' + '2'.repeat(40),
        claimAddress: '0x' + '2'.repeat(40)
      };

      const response = await swapManager.createReverseSwap(request);

      // CRITICAL: Preimage MUST NOT be in response
      expect(response).not.toHaveProperty('preimage');

      // This prevents the attack where:
      // 1. Attacker calls API, gets preimage
      // 2. Attacker pays invoice
      // 3. Service locks RBTC
      // 4. Attacker claims RBTC using preimage from step 1
      // 5. Attacker steals funds
    });
  });

  describe('❌ Attack Scenario 2: Private Key Exposure', () => {
    it('MUST NOT expose claimPrivateKey in API response', async () => {
      const request: CreateSwapRequest = {
        invoiceAmount: 10000,
        preimageHash: CryptoUtils.hashPreimage(CryptoUtils.generatePreimage()),
        claimPublicKey: '0x' + '3'.repeat(40),
        claimAddress: '0x' + '3'.repeat(40)
      };

      const response = await swapManager.createReverseSwap(request);

      // CRITICAL: Private key MUST NOT be in response
      expect(response).not.toHaveProperty('claimPrivateKey');
    });
  });

  describe('✅ Security: User Controls Preimage', () => {
    it('MUST use user-supplied preimageHash, not service-generated', async () => {
      const userPreimage = 'a'.repeat(64);
      const userPreimageHash = CryptoUtils.hashPreimage(userPreimage);

      const request: CreateSwapRequest = {
        invoiceAmount: 10000,
        preimageHash: userPreimageHash,
        claimPublicKey: '0x' + '4'.repeat(40),
        claimAddress: '0x' + '4'.repeat(40)
      };

      const response = await swapManager.createReverseSwap(request);
      const swap = swapManager.getSwapStatus(response.id);

      // Verify swap uses USER's preimageHash
      expect(swap?.preimageHash).toBe(userPreimageHash);

      // Swap should NOT have preimage stored
      expect(swap?.preimage).toBeUndefined();
    });
  });

  describe('✅ Security: Database Does Not Store Secrets', () => {
    it('MUST NOT store preimage or privateKey in database', async () => {
      const request: CreateSwapRequest = {
        invoiceAmount: 10000,
        preimageHash: CryptoUtils.hashPreimage(CryptoUtils.generatePreimage()),
        claimPublicKey: '0x' + '5'.repeat(40),
        claimAddress: '0x' + '5'.repeat(40)
      };

      const response = await swapManager.createReverseSwap(request);
      const swap = dbService.getSwap(response.id);

      // Database MUST NOT contain secrets
      expect(swap).not.toHaveProperty('preimage');
      expect(swap).not.toHaveProperty('claimPrivateKey');

      // These are OK to store (public info)
      expect(swap).toHaveProperty('preimageHash');
      expect(swap).toHaveProperty('claimPublicKey');
    });
  });

  describe('✅ Security: Input Validation', () => {
    it('MUST reject invalid preimageHash', async () => {
      const request: CreateSwapRequest = {
        invoiceAmount: 10000,
        preimageHash: 'invalid',  // Too short
        claimPublicKey: '0x' + '6'.repeat(40),
        claimAddress: '0x' + '6'.repeat(40)
      };

      await expect(swapManager.createReverseSwap(request))
        .rejects
        .toThrow('Invalid preimageHash');
    });

    it('MUST reject missing preimageHash', async () => {
      const request: any = {
        invoiceAmount: 10000,
        // Missing preimageHash
        claimPublicKey: '0x' + '7'.repeat(40),
        claimAddress: '0x' + '7'.repeat(40)
      };

      await expect(swapManager.createReverseSwap(request))
        .rejects
        .toThrow();
    });
  });

  describe('✅ Correct Protocol Flow', () => {
    it('should follow correct Reverse Swap protocol', async () => {
      /**
       * Correct Flow:
       * 1. User generates preimage + hash
       * 2. User calls API with hash (keeps preimage secret)
       * 3. Service creates HODL invoice with hash
       * 4. Service returns invoice (NO SECRETS)
       * 5. User pays invoice (funds held by HODL invoice)
       * 6. Service locks RBTC onchain
       * 7. User claims RBTC with preimage (reveals on blockchain)
       * 8. Service detects claim, extracts preimage from blockchain
       * 9. Service settles HODL invoice with extracted preimage
       * 10. Swap complete ✅
       */

      const userPreimage = CryptoUtils.generatePreimage();
      const userPreimageHash = CryptoUtils.hashPreimage(userPreimage);
      const { publicKey } = CryptoUtils.generateKeypair();

      // Step 2: User creates swap
      const request: CreateSwapRequest = {
        invoiceAmount: 10000,
        preimageHash: userPreimageHash,
        claimPublicKey: publicKey,
        claimAddress: '0x' + '8'.repeat(40)
      };

      // Step 3-4: Service creates invoice, returns response
      const response = await swapManager.createReverseSwap(request);

      // Verify security properties
      expect(response).toHaveProperty('invoice');
      expect(response).not.toHaveProperty('preimage');  // Secret stays with user
      expect(response).not.toHaveProperty('claimPrivateKey');

      // After this point:
      // - User pays invoice (step 5)
      // - Service locks RBTC (step 6)
      // - User claims with preimage (step 7)
      // - ClaimMonitor detects claim (step 8-9)
      // - Swap completes (step 10)
    });
  });
});
