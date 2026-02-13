import { Controller, Get, Res } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { Response } from 'express';
import { readFileSync } from 'fs';
import { MonitoringBalanceRepository } from '../repositories/monitoring-balance.repository';
import { MonitoringEvmBalanceRepository } from '../repositories/monitoring-evm-balance.repository';
import { MonitoringRepository } from '../repositories/monitoring.repository';

@Controller('monitoring')
export class MonitoringController {
  constructor(
    private readonly monitoringRepo: MonitoringRepository,
    private readonly monitoringBalanceRepo: MonitoringBalanceRepository,
    private readonly monitoringEvmBalanceRepo: MonitoringEvmBalanceRepository,
  ) {}

  @Get()
  @ApiExcludeEndpoint()
  async monitoringPage(@Res() res: Response): Promise<void> {
    res.send(readFileSync('src/assets/monitoring.html').toString());
  }

  @Get('data')
  @ApiExcludeEndpoint()
  async monitoringData(): Promise<{
    channels: { name: string; capacity: number; localBalance: number; remoteBalance: number }[];
    balances: {
      assetName: string;
      assetSymbol: string;
      onchainBalance: number;
      lndOnchainBalance: number;
      lightningBalance: number;
      citreaBalance: number;
      customerBalance: number;
      ldsBalance: number;
      ldsBalanceInCHF: number;
      assetPriceInCHF: number;
    }[];
    evmBalances: {
      blockchain: string;
      nativeSymbol: string;
      nativeBalance: number;
      tokens: { symbol: string; address: string; balance: number }[];
    }[];
    timestamp: string;
  }> {
    const [channels, balances, evmBalances] = await Promise.all([
      this.monitoringRepo.getLatestChannels(),
      this.monitoringBalanceRepo.getLatestBalances(),
      this.monitoringEvmBalanceRepo.getLatestEvmBalances(),
    ]);

    return {
      channels: channels.map((c) => {
        const [capacity, localBalance, remoteBalance] = c.value.split(',').map(Number);
        return {
          name: c.name,
          capacity: capacity || 0,
          localBalance: localBalance || 0,
          remoteBalance: remoteBalance || 0,
        };
      }),
      balances: balances.map((b) => ({
        assetName: b.asset?.name ?? 'Unknown',
        assetSymbol: b.asset?.symbol ?? '',
        onchainBalance: b.onchainBalance,
        lndOnchainBalance: b.lndOnchainBalance,
        lightningBalance: b.lightningBalance,
        citreaBalance: b.citreaBalance,
        customerBalance: b.customerBalance,
        ldsBalance: b.ldsBalance,
        ldsBalanceInCHF: b.ldsBalanceInCHF,
        assetPriceInCHF: b.assetPriceInCHF,
      })),
      evmBalances: evmBalances.map((e) => ({
        blockchain: e.blockchain,
        nativeSymbol: e.nativeSymbol,
        nativeBalance: e.nativeBalance,
        tokens: e.getTokenBalances(),
      })),
      timestamp: new Date().toISOString(),
    };
  }
}
