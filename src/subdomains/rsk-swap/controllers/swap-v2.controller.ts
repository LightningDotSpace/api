import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RskSwapClientService } from '../services/rsk-swap-client.service';

/**
 * Maps RSK microservice status codes to Boltz API v2 status codes
 * This ensures the frontend can correctly display swap states
 */
function mapRskStatusToBoltzStatus(rskStatus: string): string {
  const statusMap: Record<string, string> = {
    'pending': 'swap.created',
    'invoice_paid': 'invoice.settled',
    'locked': 'transaction.mempool',
    'claimed': 'transaction.claimed',
    'refunded': 'swap.refunded',
    'expired': 'swap.expired',
    'failed': 'swap.expired'
  };
  return statusMap[rskStatus] || rskStatus;
}

@ApiTags('swap-v2')
@Controller('v2/swap')
export class SwapV2Controller {
  constructor(private readonly rskSwapClientService: RskSwapClientService) {}

  @Get('reverse')
  @ApiOperation({ summary: 'Get reverse swap pairs (Boltz API v2 compatible)' })
  @ApiResponse({
    status: 200,
    description: 'Reverse swap pairs retrieved successfully',
  })
  async getReversePairs(): Promise<any> {
    // Return Boltz API v2 compatible structure
    // Structure: pairs[fromAsset][toAsset] = pair config
    return {
      BTC: {
        BTC: {
          hash: '6f47f294807bf1691dd1df1f4c195890b44cc9395ad0e5de6e08f70916731623',
          rate: 1,
          limits: {
            minimal: 2500,
            maximal: 10000000,
            maximalZeroConf: 1000000,
          },
          fees: {
            percentage: 0.25,
            minerFees: {
              claim: 64,
              lockup: 121,
            },
          },
        },
        RBTC: {
          hash: 'e643fd55d01abefba58c08c662168547f955f706333043442cbeb73b0d5a2fe9',
          rate: 1,
          limits: {
            minimal: 2500,
            maximal: 10000000,
            maximalZeroConf: 1000000,
          },
          fees: {
            percentage: 0.25,
            minerFees: {
              claim: 64,
              lockup: 121,
            },
          },
        },
      },
    };
  }

  @Get('submarine')
  @ApiOperation({ summary: 'Get submarine swap pairs (Boltz API v2 compatible)' })
  @ApiResponse({
    status: 200,
    description: 'Submarine swap pairs retrieved successfully',
  })
  async getSubmarinePairs(): Promise<any> {
    // Return empty object for now (submarine swaps not implemented)
    return {};
  }

  @Get('chain')
  @ApiOperation({ summary: 'Get chain swap pairs (Boltz API v2 compatible)' })
  @ApiResponse({
    status: 200,
    description: 'Chain swap pairs retrieved successfully',
  })
  async getChainPairs(): Promise<any> {
    // Return empty object for now (chain swaps not implemented)
    return {};
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get swap status by ID (Boltz API v2 compatible)' })
  @ApiResponse({
    status: 200,
    description: 'Swap status retrieved successfully',
  })
  async getSwapStatus(@Param('id') id: string): Promise<any> {
    const swap = await this.rskSwapClientService.getSwapStatus(id);

    // Return in Boltz API v2 format
    return {
      id: swap.id,
      status: mapRskStatusToBoltzStatus(swap.status),
      invoice: swap.invoice,
      lockupTx: swap.lockupTxId,
      claimTx: swap.claimTxId,
      timeoutBlockHeight: swap.timeoutBlockHeight,
    };
  }

  @Post('reverse')
  @ApiOperation({ summary: 'Create reverse swap (Lightning → RBTC) - Boltz API v2 compatible' })
  @ApiResponse({
    status: 201,
    description: 'Reverse swap created successfully',
  })
  async createReverseSwap(@Body() body: any): Promise<any> {
    // Extract parameters from Boltz API v2 format
    // Frontend can send either "address" or "claimAddress"
    const { invoiceAmount, address, claimAddress, preimageHash, claimPublicKey } = body;
    const finalClaimAddress = claimAddress || address;

    console.log('[SwapV2Controller] Received request:', JSON.stringify(body, null, 2));
    console.log('[SwapV2Controller] Sending to microservice:', JSON.stringify({
      invoiceAmount,
      claimAddress: finalClaimAddress,
      preimageHash,
      claimPublicKey,
    }, null, 2));

    // Call RSK microservice with all required parameters
    const swapResponse = await this.rskSwapClientService.createReverseSwap({
      invoiceAmount,
      claimAddress: finalClaimAddress,
      preimageHash,
      claimPublicKey,
    });

    // Return in Boltz API v2 format
    return {
      id: swapResponse.id,
      invoice: swapResponse.invoice,
      swapTree: {
        claimLeaf: {
          output: finalClaimAddress,
          version: 192,
        },
        refundLeaf: {
          output: swapResponse.claimPublicKey,
          version: 192,
        },
      },
      lockupAddress: swapResponse.lockupAddress,
      timeoutBlockHeight: swapResponse.timeoutBlockHeight,
      onchainAmount: swapResponse.onchainAmount,
      refundPublicKey: swapResponse.claimPublicKey,
    };
  }
}
