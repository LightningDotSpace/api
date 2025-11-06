"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LndService = void 0;
const ln_service_1 = require("ln-service");
const fs_1 = require("fs");
class LndService {
    constructor(config) {
        this.config = config;
        this.isConnected = false;
    }
    /**
     * Connect to LND
     */
    async connect() {
        try {
            const macaroon = (0, fs_1.readFileSync)(this.config.macaroonPath).toString('base64');
            const cert = (0, fs_1.readFileSync)(this.config.tlsCertPath).toString('base64');
            const { lnd } = (0, ln_service_1.authenticatedLndGrpc)({
                socket: this.config.host,
                macaroon,
                cert
            });
            this.lnd = lnd;
            this.isConnected = true;
            console.log('LND Service connected successfully');
        }
        catch (error) {
            console.error('Failed to connect to LND:', error);
            throw new Error(`LND connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Create a Hold Lightning invoice (HTLC with preimage hash)
     */
    async createInvoice(amountSats, preimageHash, memo) {
        if (!this.isConnected) {
            throw new Error('LND not connected');
        }
        try {
            // Remove 0x prefix if present
            const hash = preimageHash.startsWith('0x') ? preimageHash.slice(2) : preimageHash;
            const result = await (0, ln_service_1.createHodlInvoice)({
                lnd: this.lnd,
                tokens: amountSats,
                description: memo || `Lightning.space RSK Swap`,
                id: hash
            });
            return {
                paymentRequest: result.request,
                paymentHash: hash,
                isPaid: false,
                amountSats
            };
        }
        catch (error) {
            console.error('Failed to create invoice:', error);
            throw new Error(`Invoice creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Wait for invoice to be paid
     */
    async waitForInvoicePayment(paymentHash, timeoutMs = 300000) {
        if (!this.isConnected) {
            throw new Error('LND not connected');
        }
        return new Promise((resolve) => {
            let sub = null;
            const timeout = setTimeout(() => {
                if (sub) {
                    sub.removeAllListeners();
                }
                resolve(false); // Timeout - not paid
            }, timeoutMs);
            try {
                sub = (0, ln_service_1.subscribeToInvoice)({
                    lnd: this.lnd,
                    id: paymentHash
                });
                sub.on('invoice_updated', (invoice) => {
                    if (invoice.is_confirmed || invoice.is_held) {
                        clearTimeout(timeout);
                        sub.removeAllListeners();
                        console.log(`Invoice ${paymentHash} paid!`);
                        resolve(true);
                    }
                });
                sub.on('error', (error) => {
                    clearTimeout(timeout);
                    sub.removeAllListeners();
                    console.error('Invoice subscription error:', error);
                    resolve(false);
                });
                sub.on('end', () => {
                    clearTimeout(timeout);
                    resolve(false);
                });
            }
            catch (error) {
                clearTimeout(timeout);
                console.error('Failed to subscribe to invoice:', error);
                resolve(false);
            }
        });
    }
    /**
     * Check if invoice is paid (one-time check)
     */
    async isInvoicePaid(paymentHash) {
        if (!this.isConnected) {
            throw new Error('LND not connected');
        }
        try {
            const invoice = await (0, ln_service_1.getInvoice)({
                lnd: this.lnd,
                id: paymentHash
            });
            return invoice.is_confirmed || invoice.is_held || false;
        }
        catch (error) {
            console.error('Failed to get invoice:', error);
            return false;
        }
    }
    /**
     * Settle a HODL invoice with preimage
     * Called when user claims onchain and reveals preimage
     */
    async settleInvoice(preimage) {
        if (!this.isConnected) {
            throw new Error('LND not connected');
        }
        try {
            // ln-service settleHodlInvoice function
            const { settleHodlInvoice } = require('ln-service');
            // Remove 0x prefix if present
            const secret = preimage.startsWith('0x') ? preimage.slice(2) : preimage;
            await settleHodlInvoice({
                lnd: this.lnd,
                secret
            });
            console.log(`HODL invoice settled with preimage ${preimage.substring(0, 8)}...`);
        }
        catch (error) {
            console.error('Failed to settle invoice:', error);
            throw new Error(`Invoice settlement failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Disconnect from LND
     */
    disconnect() {
        if (this.lnd) {
            this.lnd = null;
            this.isConnected = false;
            console.log('LND Service disconnected');
        }
    }
}
exports.LndService = LndService;
//# sourceMappingURL=LndService.js.map