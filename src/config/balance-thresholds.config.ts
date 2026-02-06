import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { Direction } from 'src/subdomains/boltz/dto/boltz.dto';

export interface BalanceThreshold {
  blockchain: Blockchain;
  asset: string;
  minBalance: number;
  maxBalance: number;
  direction?: Direction;
}

export const BALANCE_THRESHOLDS: BalanceThreshold[] = [
  // Bitcoin
  { blockchain: Blockchain.BITCOIN, asset: 'BTC', minBalance: 0.1, maxBalance: 1 },

  // Lightning (Onchain, Outgoing and Incoming Channels)
  { blockchain: Blockchain.LIGHTNING, asset: 'BTC', minBalance: 0.1, maxBalance: 1 },
  { blockchain: Blockchain.LIGHTNING, asset: 'BTC', minBalance: 1, maxBalance: 5, direction: Direction.OUTGOING },
  { blockchain: Blockchain.LIGHTNING, asset: 'BTC', minBalance: 1, maxBalance: 5, direction: Direction.INCOMING },

  // Citrea
  { blockchain: Blockchain.CITREA, asset: 'cBTC', minBalance: 0.1, maxBalance: 1 },
  { blockchain: Blockchain.CITREA, asset: 'JUSD', minBalance: 1000, maxBalance: 100000 },

  // Ethereum
  { blockchain: Blockchain.ETHEREUM, asset: 'ETH', minBalance: 0.001, maxBalance: 0.1 },
  { blockchain: Blockchain.ETHEREUM, asset: 'USDC', minBalance: 1000, maxBalance: 100000 },
  { blockchain: Blockchain.ETHEREUM, asset: 'USDT', minBalance: 1000, maxBalance: 100000 },
  { blockchain: Blockchain.ETHEREUM, asset: 'WBTC', minBalance: 0, maxBalance: 1 },

  // Polygon
  { blockchain: Blockchain.POLYGON, asset: 'POL', minBalance: 1, maxBalance: 100 },
  { blockchain: Blockchain.POLYGON, asset: 'USDT', minBalance: 1000, maxBalance: 100000 },
];
