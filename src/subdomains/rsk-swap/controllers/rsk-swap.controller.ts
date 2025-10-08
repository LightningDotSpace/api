import { Controller, Post, Get, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RskSwapClientService } from '../services/rsk-swap-client.service';
import { CreateRskSwapDto } from '../dto/create-rsk-swap.dto';
import { RskSwapResponseDto } from '../dto/rsk-swap-response.dto';
import { RskSwapStatusDto } from '../dto/rsk-swap-status.dto';

@ApiTags('rsk-swap')
@Controller('rsk-swap')
export class RskSwapController {
  constructor(private readonly rskSwapClientService: RskSwapClientService) {}

  @Post('reverse')
  @ApiOperation({ summary: 'Create reverse swap (Lightning → RBTC)' })
  @ApiResponse({
    status: 201,
    description: 'Reverse swap created successfully',
    type: RskSwapResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request parameters',
  })
  @ApiResponse({
    status: 503,
    description: 'RSK microservice unavailable',
  })
  async createReverseSwap(@Body() createSwapDto: CreateRskSwapDto): Promise<RskSwapResponseDto> {
    try {
      return await this.rskSwapClientService.createReverseSwap({
        invoiceAmount: createSwapDto.invoiceAmount,
        claimAddress: createSwapDto.claimAddress,
      });
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          message: 'Failed to create RSK swap',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get swap status by ID' })
  @ApiResponse({
    status: 200,
    description: 'Swap status retrieved successfully',
    type: RskSwapStatusDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Swap not found',
  })
  @ApiResponse({
    status: 503,
    description: 'RSK microservice unavailable',
  })
  async getSwapStatus(@Param('id') id: string): Promise<RskSwapStatusDto> {
    try {
      return await this.rskSwapClientService.getSwapStatus(id);
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          message: 'Failed to get swap status',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  @Get('health/check')
  @ApiOperation({ summary: 'Check RSK microservice health' })
  @ApiResponse({
    status: 200,
    description: 'Microservice is healthy',
  })
  @ApiResponse({
    status: 503,
    description: 'Microservice is unavailable',
  })
  async checkHealth(): Promise<{ status: string; healthy: boolean }> {
    const healthy = await this.rskSwapClientService.checkHealth();

    if (!healthy) {
      throw new HttpException(
        {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          message: 'RSK microservice is unavailable',
          status: 'unhealthy',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return {
      status: 'ok',
      healthy: true,
    };
  }
}
