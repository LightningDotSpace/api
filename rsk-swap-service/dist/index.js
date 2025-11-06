"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const RskService_1 = require("./services/RskService");
const LndService_1 = require("./services/LndService");
const DatabaseService_1 = require("./services/DatabaseService");
const SwapManager_1 = require("./services/SwapManager");
const ClaimMonitor_1 = require("./services/ClaimMonitor");
const swap_routes_1 = require("./routes/swap.routes");
// Load environment variables
dotenv_1.default.config();
const PORT = process.env.PORT || 3002;
const RSK_RPC_URL = process.env.RSK_RPC_URL || 'https://public-node.rsk.co';
const RSK_PRIVATE_KEY = process.env.RSK_PRIVATE_KEY;
const ETHERSWAP_ADDRESS = process.env.ETHERSWAP_ADDRESS || '0x3d9cc5780CA1db78760ad3D35458509178A85A4A';
const LND_HOST = process.env.LND_HOST || 'localhost:10009';
const LND_MACAROON_PATH = process.env.LND_MACAROON_PATH || '/tmp/lnd-files/admin.macaroon';
const LND_TLS_CERT_PATH = process.env.LND_TLS_CERT_PATH || '/tmp/lnd-files/tls.cert';
const DB_PATH = process.env.DB_PATH || './rsk-swaps.db';
async function startServer() {
    try {
        console.log('=== RSK Atomic Swap Microservice ===\n');
        // Validate required environment variables
        if (!RSK_PRIVATE_KEY) {
            throw new Error('RSK_PRIVATE_KEY is required in .env file');
        }
        // Initialize services
        console.log('Initializing services...');
        const rskService = new RskService_1.RskService(RSK_RPC_URL, RSK_PRIVATE_KEY, ETHERSWAP_ADDRESS, 30 // RSK Mainnet Chain ID
        );
        const lndService = new LndService_1.LndService({
            host: LND_HOST,
            macaroonPath: LND_MACAROON_PATH,
            tlsCertPath: LND_TLS_CERT_PATH
        });
        await lndService.connect();
        const dbService = new DatabaseService_1.DatabaseService(DB_PATH);
        const swapManager = new SwapManager_1.SwapManager(rskService, lndService, dbService);
        // Initialize ClaimMonitor
        const claimMonitor = new ClaimMonitor_1.ClaimMonitor(rskService, lndService, dbService);
        // Store instance for graceful shutdown
        claimMonitorInstance = claimMonitor;
        // Start monitoring for claims
        claimMonitor.start();
        console.log('ClaimMonitor started - watching for onchain claims');
        // Initialize Express app
        const app = (0, express_1.default)();
        // Middleware
        app.use((0, cors_1.default)());
        app.use(express_1.default.json());
        // Routes
        app.use('/api/swaps', (0, swap_routes_1.createSwapRoutes)(swapManager));
        // Health check
        app.get('/health', (req, res) => {
            res.json({
                status: 'ok',
                service: 'rsk-swap-service',
                version: '1.0.0',
                rskAddress: rskService.getAddress()
            });
        });
        // Error handler
        app.use((err, req, res, next) => {
            console.error('Unhandled error:', err);
            res.status(500).json({
                error: 'Internal server error',
                message: err.message
            });
        });
        // Start server
        app.listen(PORT, () => {
            console.log(`\n RSK Swap Service listening on port ${PORT}`);
            console.log(` RSK Wallet: ${rskService.getAddress()}`);
            console.log(` Database: ${DB_PATH}`);
            console.log(` EtherSwap Contract: ${ETHERSWAP_ADDRESS}`);
            console.log('\nEndpoints:');
            console.log(`  POST http://localhost:${PORT}/api/swaps/reverse`);
            console.log(`  GET  http://localhost:${PORT}/api/swaps/:id`);
            console.log(`  GET  http://localhost:${PORT}/api/swaps`);
            console.log(`  GET  http://localhost:${PORT}/health\n`);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}
// Handle graceful shutdown
let claimMonitorInstance = null;
process.on('SIGINT', () => {
    console.log('\nShutting down gracefully...');
    if (claimMonitorInstance) {
        claimMonitorInstance.stop();
    }
    process.exit(0);
});
process.on('SIGTERM', () => {
    console.log('\nShutting down gracefully...');
    if (claimMonitorInstance) {
        claimMonitorInstance.stop();
    }
    process.exit(0);
});
// Start the server
startServer();
//# sourceMappingURL=index.js.map