import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Config, Process } from 'src/config/config';
import { EvmRegistryService } from 'src/integration/blockchain/shared/evm/registry/evm-registry.service';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { LightningLogger } from 'src/shared/services/lightning-logger';
import { Lock } from 'src/shared/utils/lock';
import { Equal } from 'typeorm';
import { EvmChainConfig, EvmTokenBalanceJson } from '../dto/monitoring.dto';
import { MonitoringEvmBalanceEntity } from '../entities/monitoring-evm-balance.entity';
import { MonitoringEvmBalanceRepository } from '../repositories/monitoring-evm-balance.repository';
import { MonitoringRepository } from '../repositories/monitoring.repository';

const EVM_TOKEN_CONFIG_TYPE = 'evm_token_config';

@Injectable()
export class MonitoringEvmService implements OnModuleInit {
  private readonly logger = new LightningLogger(MonitoringEvmService);

  constructor(
    private readonly evmRegistryService: EvmRegistryService,
    private readonly monitoringRepository: MonitoringRepository,
    private readonly monitoringEvmBalanceRepository: MonitoringEvmBalanceRepository,
  ) {}

  onModuleInit() {
    void this.processEvmBalances();
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  @Lock(1800)
  async processEvmBalances(): Promise<void> {
    if (Config.processDisabled(Process.UPDATE_WALLET_BALANCE)) return;

    const chainConfigs = await this.getEvmChainConfigs();

    for (const [blockchain, config] of chainConfigs) {
      try {
        await this.processChainBalance(blockchain, config);
      } catch (e) {
        this.logger.error(`Error processing ${blockchain} balance`, e);
      }
    }
  }

  private async getEvmChainConfigs(): Promise<Map<Blockchain, EvmChainConfig>> {
    const configs = await this.monitoringRepository.findBy({
      type: Equal(EVM_TOKEN_CONFIG_TYPE),
    });

    const result = new Map<Blockchain, EvmChainConfig>();

    for (const config of configs) {
      try {
        const blockchain = config.name as Blockchain;
        const parsed = JSON.parse(config.value) as EvmChainConfig;
        result.set(blockchain, parsed);
      } catch (e) {
        this.logger.error(`Failed to parse EVM config for ${config.name}`, e);
      }
    }

    return result;
  }

  private async processChainBalance(blockchain: Blockchain, config: EvmChainConfig): Promise<void> {
    const evmClient = this.evmRegistryService.getClient(blockchain);

    // Get native balance
    const nativeBalance = await evmClient.getNativeCoinBalance();

    // Get token balances
    const tokenBalances: EvmTokenBalanceJson[] = [];

    for (const token of config.tokens) {
      try {
        const balance = await evmClient.getTokenBalanceByAddress(token.address, token.decimals);
        tokenBalances.push({
          symbol: token.symbol,
          address: token.address,
          balance,
        });
      } catch (e) {
        this.logger.warn(`Failed to get ${token.symbol} balance on ${blockchain}: ${e.message}`);
      }
    }

    const entity = MonitoringEvmBalanceEntity.create(blockchain, config.nativeSymbol, nativeBalance, tokenBalances);

    await this.monitoringEvmBalanceRepository.saveIfBalanceDiff(entity);
  }
}
