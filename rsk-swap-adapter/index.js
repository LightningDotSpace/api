const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = 3003;

// RSK Swap Service endpoint
const RSK_SERVICE_URL = 'http://localhost:3001';

app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

/**
 * Boltz API → RSK Service Adapter
 *
 * Maps Boltz Web App API calls to RSK Swap Service endpoints
 */

// Health check
app.get('/health', async (req, res) => {
  try {
    const response = await axios.get(`${RSK_SERVICE_URL}/health`);
    res.json({
      status: 'ok',
      adapter: 'rsk-swap-adapter',
      rskService: response.data
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// V2 API Endpoints (newer Boltz Web App version)

// GET /v1/atomic-swap/v2/swap/reverse (V2 version)
app.get('/v1/atomic-swap/v2/swap/reverse', (req, res) => {
  const pairData = {
    hash: 'rsk',
    rate: 1,
    fees: {
      percentage: 1,
      minerFees: {
        lockup: 1000,
        claim: 1000
      }
    },
    limits: {
      minimal: 10000,
      maximal: 100000
    }
  };

  // V2 API expects double-nested structure: { "RBTC": { "BTC": {...} } }
  res.json({
    'RBTC': {
      'BTC': pairData
    },
    'BTC': {
      'RBTC': pairData // Support both directions
    }
  });
});

// GET /v1/atomic-swap/v2/swap/submarine
app.get('/v1/atomic-swap/v2/swap/submarine', (req, res) => {
  res.json({});
});

// GET /v1/atomic-swap/v2/swap/chain
app.get('/v1/atomic-swap/v2/swap/chain', (req, res) => {
  res.json({});
});

// GET /v1/atomic-swap/v2/chain/contracts
app.get('/v1/atomic-swap/v2/chain/contracts', (req, res) => {
  res.json({
    rsk: {
      etherSwap: '0x3d9cc5780CA1db78760ad3D35458509178A85A4A'
    }
  });
});

// GET /v1/atomic-swap/v2/nodes/stats
app.get('/v1/atomic-swap/v2/nodes/stats', (req, res) => {
  res.json({});
});

// WebSocket endpoint placeholder
app.get('/v1/atomic-swap/v2/ws', (req, res) => {
  res.status(501).json({ error: 'WebSocket not implemented' });
});

// POST /v1/atomic-swap/v2/swap/reverse (V2 create reverse swap)
app.post('/v1/atomic-swap/v2/swap/reverse', async (req, res) => {
  try {
    console.log('V2: Creating reverse swap:', JSON.stringify(req.body, null, 2));

    const {
      from,
      to,
      invoiceAmount,
      preimageHash,
      claimPublicKey,
      address,
      addressSignature,
      referralId
    } = req.body;

    // Validate required fields
    if (!invoiceAmount || !preimageHash || !claimPublicKey) {
      return res.status(400).json({
        error: 'Missing required fields: invoiceAmount, preimageHash, claimPublicKey'
      });
    }

    // Map to RSK Service request
    const rskRequest = {
      invoiceAmount: parseInt(invoiceAmount),
      preimageHash: preimageHash,
      claimPublicKey: claimPublicKey,
      address: address || 'bc1qkh006qn9eyaqfchmg9da4vw4fnt4xz908gah7h'
    };

    console.log('V2: Forwarding to RSK Service:', JSON.stringify(rskRequest, null, 2));

    // Call RSK Service
    const response = await axios.post(
      `${RSK_SERVICE_URL}/api/swaps/reverse`,
      rskRequest
    );

    console.log('V2: RSK Service response:', JSON.stringify(response.data, null, 2));

    // Map RSK Service response to Boltz V2 format
    const boltzResponse = {
      id: response.data.id,
      invoice: response.data.invoice,
      swapTree: {
        claimLeaf: { output: '', version: 0 },
        refundLeaf: { output: '', version: 0 }
      },
      blindingKey: null,
      onchainAmount: response.data.onchainAmount || invoiceAmount,
      timeoutBlockHeight: response.data.timeoutBlockHeight,
      claimAddress: response.data.claimAddress
    };

    res.json(boltzResponse);
  } catch (error) {
    console.error('V2: Error creating reverse swap:', error.message);

    if (error.response) {
      console.error('V2: RSK Service error:', error.response.data);
      res.status(error.response.status).json({
        error: error.response.data.error || error.message
      });
    } else {
      res.status(500).json({
        error: error.message
      });
    }
  }
});

// GET /v1/atomic-swap/v2/swap/:id (V2 get swap status)
app.get('/v1/atomic-swap/v2/swap/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`V2: Getting swap status for: ${id}`);

    const response = await axios.get(`${RSK_SERVICE_URL}/api/swaps/${id}`);
    console.log('V2: RSK Service swap status:', JSON.stringify(response.data, null, 2));

    // Map RSK Service status to Boltz V2 format
    const swap = response.data;
    const boltzStatus = {
      status: mapStatus(swap.status),
      failureReason: null,
      ...(swap.lockupTxId && {
        transaction: {
          id: swap.lockupTxId,
          hex: ''
        }
      }),
      ...(swap.claimTxId && {
        claimTransaction: {
          id: swap.claimTxId,
          hex: ''
        }
      })
    };

    res.json(boltzStatus);
  } catch (error) {
    console.error('V2: Error getting swap status:', error.message);

    if (error.response?.status === 404) {
      res.status(404).json({
        error: 'Swap not found'
      });
    } else if (error.response) {
      res.status(error.response.status).json({
        error: error.response.data.error || error.message
      });
    } else {
      res.status(500).json({
        error: error.message
      });
    }
  }
});

// V1 API Endpoints (legacy support)

// GET /v1/atomic-swap/getpairs
// Returns available swap pairs (for Boltz compatibility)
app.get('/v1/atomic-swap/getpairs', (req, res) => {
  res.json({
    pairs: {
      'BTC/BTC': {
        rate: 1,
        limits: {
          maximal: 4294967,
          minimal: 10000,
          maximalZeroConf: {
            baseAsset: 0,
            quoteAsset: 0
          }
        },
        fees: {
          percentage: 0.5,
          minerFees: {
            baseAsset: {
              normal: 3000,
              reverse: 3000
            },
            quoteAsset: {
              normal: 0,
              reverse: 0
            }
          }
        },
        hash: 'test'
      },
      'RBTC/BTC': {
        rate: 1,
        limits: {
          maximal: 100000,
          minimal: 10000,
          maximalZeroConf: {
            baseAsset: 0,
            quoteAsset: 0
          }
        },
        fees: {
          percentage: 1,
          minerFees: {
            baseAsset: {
              normal: 1000,
              reverse: 1000
            },
            quoteAsset: {
              normal: 0,
              reverse: 0
            }
          }
        },
        hash: 'rsk'
      }
    },
    info: [],
    warnings: []
  });
});

// POST /v1/atomic-swap/createswap (Normal Swap - not implemented yet)
app.post('/v1/atomic-swap/createswap', (req, res) => {
  res.status(501).json({
    error: 'Normal swaps not implemented yet. Use reverse swaps (Lightning → RBTC)'
  });
});

// POST /v1/atomic-swap/createreverseswap
// Maps to POST /api/swaps/reverse
app.post('/v1/atomic-swap/createreverseswap', async (req, res) => {
  try {
    console.log('Creating reverse swap:', JSON.stringify(req.body, null, 2));

    const {
      type,
      pairId,
      orderSide,
      invoiceAmount,
      preimageHash,
      claimPublicKey,
      address,
      addressSignature,
      referralId
    } = req.body;

    // Validate required fields
    if (!invoiceAmount || !preimageHash || !claimPublicKey) {
      return res.status(400).json({
        error: 'Missing required fields: invoiceAmount, preimageHash, claimPublicKey'
      });
    }

    // Map to RSK Service request
    const rskRequest = {
      invoiceAmount: parseInt(invoiceAmount),
      preimageHash: preimageHash,
      claimPublicKey: claimPublicKey,
      address: address || 'bc1qkh006qn9eyaqfchmg9da4vw4fnt4xz908gah7h' // Default BTC address
    };

    console.log('Forwarding to RSK Service:', JSON.stringify(rskRequest, null, 2));

    // Call RSK Service
    const response = await axios.post(
      `${RSK_SERVICE_URL}/api/swaps/reverse`,
      rskRequest
    );

    console.log('RSK Service response:', JSON.stringify(response.data, null, 2));

    // Map RSK Service response to Boltz format
    const boltzResponse = {
      id: response.data.id,
      invoice: response.data.invoice,
      redeemScript: '', // Not used in RSK swaps
      lockupAddress: '', // Will be provided after invoice payment
      onchainAmount: response.data.onchainAmount || invoiceAmount,
      timeoutBlockHeight: response.data.timeoutBlockHeight,
      blindingKey: null,
      // Additional RSK-specific fields
      rsk: {
        lockupTxId: response.data.lockupTxId,
        claimAddress: response.data.claimAddress,
        status: response.data.status
      }
    };

    res.json(boltzResponse);
  } catch (error) {
    console.error('Error creating reverse swap:', error.message);

    if (error.response) {
      console.error('RSK Service error:', error.response.data);
      res.status(error.response.status).json({
        error: error.response.data.error || error.message
      });
    } else {
      res.status(500).json({
        error: error.message
      });
    }
  }
});

// GET /v1/atomic-swap/swapstatus/:id
// Maps to GET /api/swaps/:id
app.get('/v1/atomic-swap/swapstatus/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Getting swap status for: ${id}`);

    const response = await axios.get(`${RSK_SERVICE_URL}/api/swaps/${id}`);
    console.log('RSK Service swap status:', JSON.stringify(response.data, null, 2));

    // Map RSK Service status to Boltz format
    const swap = response.data;
    const boltzStatus = {
      status: mapStatus(swap.status),
      // Add transaction details if available
      ...(swap.lockupTxId && {
        transaction: {
          id: swap.lockupTxId,
          hex: '',
          eta: null
        }
      }),
      ...(swap.claimTxId && {
        claimTransaction: {
          id: swap.claimTxId,
          hex: ''
        }
      })
    };

    res.json(boltzStatus);
  } catch (error) {
    console.error('Error getting swap status:', error.message);

    if (error.response?.status === 404) {
      res.status(404).json({
        error: 'Swap not found'
      });
    } else if (error.response) {
      res.status(error.response.status).json({
        error: error.response.data.error || error.message
      });
    } else {
      res.status(500).json({
        error: error.message
      });
    }
  }
});

// GET /v1/atomic-swap/getreverseswaptree/:id (for claim info)
app.get('/v1/atomic-swap/getreverseswaptree/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const response = await axios.get(`${RSK_SERVICE_URL}/api/swaps/${id}`);

    // Return minimal tree info (RSK uses different claim mechanism)
    res.json({
      claimLeaf: {
        output: '',
        version: 0
      },
      refundLeaf: {
        output: '',
        version: 0
      }
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

// GET /v1/atomic-swap/broadcasttransaction (for claim broadcasting)
app.post('/v1/atomic-swap/broadcasttransaction', (req, res) => {
  // RSK swaps are claimed automatically by ClaimMonitor
  res.json({
    success: true,
    message: 'RSK swaps are claimed automatically'
  });
});

/**
 * Helper function to map RSK Service status to Boltz status
 */
function mapStatus(rskStatus) {
  const statusMap = {
    'pending': 'swap.created',
    'invoice_paid': 'invoice.paid',
    'locked': 'transaction.confirmed',
    'claimed': 'transaction.claimed',
    'failed': 'swap.expired',
    'refunded': 'swap.refunded'
  };

  return statusMap[rskStatus] || 'swap.created';
}

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
  console.log(`\n🔄 RSK Swap Adapter listening on port ${PORT}`);
  console.log(`📡 Forwarding to RSK Service: ${RSK_SERVICE_URL}`);
  console.log(`\nEndpoints:`);
  console.log(`  GET  http://localhost:${PORT}/health`);
  console.log(`  GET  http://localhost:${PORT}/v1/atomic-swap/getpairs`);
  console.log(`  POST http://localhost:${PORT}/v1/atomic-swap/createreverseswap`);
  console.log(`  GET  http://localhost:${PORT}/v1/atomic-swap/swapstatus/:id`);
  console.log(`\nBoltz Web App should use: http://localhost:${PORT}/v1/atomic-swap\n`);
});
