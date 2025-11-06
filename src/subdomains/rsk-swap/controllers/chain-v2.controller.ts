import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('chain-v2')
@Controller('v2/chain')
export class ChainV2Controller {
  @Get('contracts')
  @ApiOperation({ summary: 'Get RSK contract addresses and network info (Boltz API v2 compatible)' })
  @ApiResponse({
    status: 200,
    description: 'Contract addresses retrieved successfully',
  })
  async getContracts(): Promise<any> {
    return {
      rsk: {
        network: {
          chainId: 30,
          name: 'RSK Mainnet',
        },
        tokens: {},
        swapContracts: {
          EtherSwap: '0x3d9cc5780CA1db78760ad3D35458509178A85A4A',
          ERC20Swap: '0x7d5a2187CC8EF75f8822daB0E8C9a2DB147BA045',
        },
      },
    };
  }
}
