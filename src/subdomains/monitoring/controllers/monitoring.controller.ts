import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { Response } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';
import { EvmTokenBalanceJson } from '../dto/monitoring.dto';
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
    res.send(readFileSync(join(__dirname, '..', '..', '..', 'assets', 'monitoring.html')).toString());
  }

  @Get('monitoring.js')
  @ApiExcludeEndpoint()
  async monitoringScript(@Res() res: Response): Promise<void> {
    res.type('application/javascript').send(
      readFileSync(join(__dirname, '..', '..', '..', 'assets', 'monitoring.js')).toString(),
    );
  }

  @Get('btc')
  @ApiExcludeEndpoint()
  async btcPage(@Res() res: Response): Promise<void> {
    res.send(readFileSync(join(__dirname, '..', '..', '..', 'assets', 'monitoring-btc.html')).toString());
  }

  @Get('btc.js')
  @ApiExcludeEndpoint()
  async btcScript(@Res() res: Response): Promise<void> {
    res.type('application/javascript').send(
      readFileSync(join(__dirname, '..', '..', '..', 'assets', 'monitoring-btc.js')).toString(),
    );
  }

  @Get('usd')
  @ApiExcludeEndpoint()
  async usdPage(@Res() res: Response): Promise<void> {
    res.send(readFileSync(join(__dirname, '..', '..', '..', 'assets', 'monitoring-usd.html')).toString());
  }

  @Get('usd.js')
  @ApiExcludeEndpoint()
  async usdScript(@Res() res: Response): Promise<void> {
    res.type('application/javascript').send(
      readFileSync(join(__dirname, '..', '..', '..', 'assets', 'monitoring-usd.js')).toString(),
    );
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

  @Get('btc/history')
  @ApiExcludeEndpoint()
  async btcHistory(
    @Query('range') range: string,
  ): Promise<{ points: { timestamp: string; netBalance: number }[]; range: string }> {
    const { fromDate, grouping } = this.parseRange(range);

    const [balanceHistory, evmHistory, seedBalance, seedEvmBalances] = await Promise.all([
      this.monitoringBalanceRepo.getBalanceHistory('Bitcoin', fromDate, grouping),
      this.monitoringEvmBalanceRepo.getEvmBalanceHistory(fromDate, grouping),
      this.monitoringBalanceRepo.getLastBalanceBefore('Bitcoin', fromDate),
      this.monitoringEvmBalanceRepo.getLastEvmBalancesBefore(fromDate),
    ]);

    const safeRange = this.sanitizeRange(range);
    return { points: this.mergeBtcHistory(balanceHistory, evmHistory, seedBalance, seedEvmBalances), range: safeRange };
  }

  @Get('usd/history')
  @ApiExcludeEndpoint()
  async usdHistory(
    @Query('range') range: string,
  ): Promise<{ points: { timestamp: string; totalBalance: number }[]; range: string }> {
    const { fromDate, grouping } = this.parseRange(range);

    const [evmHistory, seedEvmBalances] = await Promise.all([
      this.monitoringEvmBalanceRepo.getEvmBalanceHistory(fromDate, grouping),
      this.monitoringEvmBalanceRepo.getLastEvmBalancesBefore(fromDate),
    ]);

    const safeRange = this.sanitizeRange(range);
    return { points: this.buildUsdHistory(evmHistory, seedEvmBalances), range: safeRange };
  }

  // --- PRIVATE HELPERS --- //

  private sanitizeRange(range: string): string {
    const valid = ['24h', '7d', '30d'];
    return valid.includes(range) ? range : '24h';
  }

  private parseRange(range: string): { fromDate: Date; grouping: 'raw' | 'hourly' | 'daily' } {
    const now = new Date();

    switch (range) {
      case '7d':
        return { fromDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), grouping: 'hourly' };
      case '30d':
        return { fromDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), grouping: 'daily' };
      default:
        return { fromDate: new Date(now.getTime() - 24 * 60 * 60 * 1000), grouping: 'raw' };
    }
  }

  private parseTokenBalances(json: string): EvmTokenBalanceJson[] {
    if (!json) return [];

    try {
      const parsed = JSON.parse(json) as { tokens: EvmTokenBalanceJson[] };
      return parsed.tokens ?? [];
    } catch {
      return [];
    }
  }

  private mergeBtcHistory(
    balanceHistory: { timestamp: string; onchainBalance: number; lndOnchainBalance: number; lightningBalance: number; citreaBalance: number; customerBalance: number }[],
    evmHistory: { timestamp: string; blockchain: string; nativeBalance: number; tokenBalances: string }[],
    seedBalance?: { timestamp: string; onchainBalance: number; lndOnchainBalance: number; lightningBalance: number; citreaBalance: number; customerBalance: number },
    seedEvmBalances?: { timestamp: string; blockchain: string; nativeBalance: number; tokenBalances: string }[],
  ): { timestamp: string; netBalance: number }[] {
    const allTimestamps = new Set<string>();
    for (const b of balanceHistory) allTimestamps.add(new Date(b.timestamp).toISOString());
    for (const e of evmHistory) allTimestamps.add(new Date(e.timestamp).toISOString());

    const sorted = [...allTimestamps].sort();

    let lastBalance: typeof balanceHistory[0] | null = seedBalance ?? null;
    const lastEvm: Record<string, typeof evmHistory[0]> = {};
    if (seedEvmBalances) for (const e of seedEvmBalances) lastEvm[e.blockchain] = e;
    let balIdx = 0;
    let evmIdx = 0;

    const points: { timestamp: string; netBalance: number }[] = [];

    for (const ts of sorted) {
      while (balIdx < balanceHistory.length && new Date(balanceHistory[balIdx].timestamp).toISOString() <= ts) {
        lastBalance = balanceHistory[balIdx];
        balIdx++;
      }

      while (evmIdx < evmHistory.length && new Date(evmHistory[evmIdx].timestamp).toISOString() <= ts) {
        lastEvm[evmHistory[evmIdx].blockchain] = evmHistory[evmIdx];
        evmIdx++;
      }

      const onchain = lastBalance ? (Number(lastBalance.onchainBalance) + Number(lastBalance.lndOnchainBalance) + Number(lastBalance.lightningBalance) + Number(lastBalance.citreaBalance)) / 1e8 : 0;
      const customer = lastBalance ? Number(lastBalance.customerBalance) / 1e8 : 0;

      let wbtc = 0;
      let wbtce = 0;

      if (lastEvm['ethereum']) {
        const tokens = this.parseTokenBalances(lastEvm['ethereum'].tokenBalances);
        const t = tokens.find((tk) => tk.symbol === 'WBTC');
        if (t) wbtc = t.balance;
      }

      if (lastEvm['citrea']) {
        const tokens = this.parseTokenBalances(lastEvm['citrea'].tokenBalances);
        const t = tokens.find((tk) => tk.symbol === 'WBTCe');
        if (t) wbtce = t.balance;
      }

      points.push({
        timestamp: ts,
        netBalance: onchain + wbtc + wbtce - customer,
      });
    }

    return points;
  }

  private buildUsdHistory(
    evmHistory: { timestamp: string; blockchain: string; nativeBalance: number; tokenBalances: string }[],
    seedEvmBalances?: { timestamp: string; blockchain: string; nativeBalance: number; tokenBalances: string }[],
  ): { timestamp: string; totalBalance: number }[] {
    const usdTokens = [
      { symbol: 'JUSD', chain: 'citrea' },
      { symbol: 'USDC', chain: 'ethereum' },
      { symbol: 'USDT', chain: 'ethereum' },
      { symbol: 'USDT', chain: 'polygon' },
    ];

    const allTimestamps = new Set<string>();
    for (const e of evmHistory) allTimestamps.add(new Date(e.timestamp).toISOString());

    const sorted = [...allTimestamps].sort();

    const lastEvm: Record<string, typeof evmHistory[0]> = {};
    if (seedEvmBalances) for (const e of seedEvmBalances) lastEvm[e.blockchain] = e;
    let evmIdx = 0;

    const points: { timestamp: string; totalBalance: number }[] = [];

    for (const ts of sorted) {
      while (evmIdx < evmHistory.length && new Date(evmHistory[evmIdx].timestamp).toISOString() <= ts) {
        lastEvm[evmHistory[evmIdx].blockchain] = evmHistory[evmIdx];
        evmIdx++;
      }

      let total = 0;
      for (const def of usdTokens) {
        if (lastEvm[def.chain]) {
          const tokens = this.parseTokenBalances(lastEvm[def.chain].tokenBalances);
          const t = tokens.find((tk) => tk.symbol === def.symbol);
          if (t) total += t.balance;
        }
      }

      points.push({ timestamp: ts, totalBalance: total });
    }

    return points;
  }
}
