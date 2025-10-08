import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { AtomicSwapService } from '../services/atomic-swap.service';
import { CreateSubmarineSwapDto, CreateReverseSwapDto } from '../dto/create-submarine-swap.dto';

@Controller('atomic-swap')
export class AtomicSwapController {
  constructor(private readonly atomicSwapService: AtomicSwapService) {}

  @Get('info')
  async getSwapInfo() {
    return this.atomicSwapService.getSwapInfo();
  }

  @Post('submarine')
  async createSubmarineSwap(@Body() dto: CreateSubmarineSwapDto) {
    return this.atomicSwapService.createSubmarineSwap(dto);
  }

  @Post('reverse')
  async createReverseSwap(@Body() dto: CreateReverseSwapDto) {
    return this.atomicSwapService.createReverseSwap(dto);
  }

  @Get('status/:swapId')
  async getSwapStatus(@Param('swapId') swapId: string) {
    return this.atomicSwapService.getSwapStatus(swapId);
  }

  @Post('broadcast/:currency')
  async broadcastTransaction(
    @Param('currency') currency: string,
    @Body('transactionHex') transactionHex: string,
  ) {
    return this.atomicSwapService.broadcastTransaction(currency, transactionHex);
  }
}
