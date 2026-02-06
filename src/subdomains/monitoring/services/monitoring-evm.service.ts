import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Config, Process } from 'src/config/config';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { LightningLogger } from 'src/shared/services/lightning-logger';
import { Lock } from 'src/shared/utils/lock';
import { BalanceDto } from 'src/subdomains/boltz/dto/boltz.dto';
import { BoltzBalanceService } from 'src/subdomains/boltz/services/boltz-balance.service';
import { EvmTokenBalanceJson } from '../dto/monitoring.dto';
import { MonitoringEvmBalanceEntity } from '../entities/monitoring-evm-balance.entity';
import { MonitoringEvmBalanceRepository } from '../repositories/monitoring-evm-balance.repository';

interface ChainBalanceData {
  nativeSymbol: string;
  nativeBalance: number;
  tokens: EvmTokenBalanceJson[];
}

const NATIVE_ASSETS: Record<string, string> = {
  [Blockchain.CITREA]: 'cBTC',
  [Blockchain.ETHEREUM]: 'ETH',
  [Blockchain.POLYGON]: 'POL',
};

@Injectable()
export class MonitoringEvmService implements OnModuleInit {
  private readonly logger = new LightningLogger(MonitoringEvmService);

  constructor(
    private readonly boltzBalanceService: BoltzBalanceService,
    private readonly monitoringEvmBalanceRepository: MonitoringEvmBalanceRepository,
  ) {}

  onModuleInit() {
    void this.processEvmBalances();
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  @Lock(1800)
  async processEvmBalances(): Promise<void> {
    if (Config.processDisabled(Process.MONITORING)) return;

    try {
      const balances = await this.boltzBalanceService.getEvmBalances();
      const groupedBalances = this.groupBalancesByBlockchain(balances);

      for (const [blockchain, data] of groupedBalances) {
        await this.saveChainBalance(blockchain, data);
      }
    } catch (e) {
      this.logger.error('Error processing EVM balances', e);
    }
  }

  private groupBalancesByBlockchain(balances: BalanceDto[]): Map<Blockchain, ChainBalanceData> {
    const result = new Map<Blockchain, ChainBalanceData>();

    for (const balance of balances) {
      const nativeAsset = NATIVE_ASSETS[balance.blockchain];
      if (!nativeAsset) continue;

      if (!result.has(balance.blockchain)) {
        result.set(balance.blockchain, {
          nativeSymbol: nativeAsset,
          nativeBalance: 0,
          tokens: [],
        });
      }

      const chainData = result.get(balance.blockchain);
      if (!chainData) continue;

      if (balance.asset === nativeAsset) {
        chainData.nativeBalance = balance.balance;
      } else {
        chainData.tokens.push({
          symbol: balance.asset,
          address: '',
          balance: balance.balance,
        });
      }
    }

    return result;
  }

  private async saveChainBalance(blockchain: Blockchain, data: ChainBalanceData): Promise<void> {
    const entity = MonitoringEvmBalanceEntity.create(
      blockchain,
      data.nativeSymbol,
      data.nativeBalance,
      data.tokens,
    );

    await this.monitoringEvmBalanceRepository.saveIfBalanceDiff(entity);
  }
}
