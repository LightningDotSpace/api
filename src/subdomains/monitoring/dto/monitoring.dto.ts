export interface EvmChainConfig {
  nativeSymbol: string;
  tokens: TokenConfig[];
}

export interface TokenConfig {
  symbol: string;
  address: string;
  decimals: number;
}

export interface MonitoringBlockchainBalance {
  onchainBalance: number;
  lndOnchainBalance: number;
  lightningBalance: number;
  citreaBalance: number;
}

export interface EvmTokenBalanceJson {
  symbol: string;
  address: string;
  balance: number;
}
