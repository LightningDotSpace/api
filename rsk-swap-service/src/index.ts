import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { RskService } from './services/RskService';
import { LndService } from './services/LndService';
import { DatabaseService } from './services/DatabaseService';
import { SwapManager } from './services/SwapManager';
import { createSwapRoutes } from './routes/swap.routes';

// Load environment variables
dotenv.config();

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

    const rskService = new RskService(
      RSK_RPC_URL,
      RSK_PRIVATE_KEY,
      ETHERSWAP_ADDRESS,
      30 // RSK Mainnet Chain ID
    );

    const lndService = new LndService({
      host: LND_HOST,
      macaroonPath: LND_MACAROON_PATH,
      tlsCertPath: LND_TLS_CERT_PATH
    });

    await lndService.connect();

    const dbService = new DatabaseService(DB_PATH);

    const swapManager = new SwapManager(
      rskService,
      lndService,
      dbService
    );

    // Initialize Express app
    const app = express();

    // Middleware
    app.use(cors());
    app.use(express.json());

    // Routes
    app.use('/api/swaps', createSwapRoutes(swapManager));

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
    app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
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

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer();
