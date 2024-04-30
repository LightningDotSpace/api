import { Util } from '../utils/util';

export enum Blockchain {
  LIGHTNING = 'Lightning',
  BITCOIN = 'Bitcoin',
  ETHEREUM = 'Ethereum',
  OPTIMISM = 'Optimism',
  ARBITRUM = 'Arbitrum',
  POLYGON = 'Polygon',
  BASE = 'Base',
}

export function blockchainFindBy(value: string): Blockchain | undefined {
  return Object.values(Blockchain).find((b) => Util.equalsIgnoreCase(b, value));
}
