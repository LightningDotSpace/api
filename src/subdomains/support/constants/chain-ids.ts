/**
 * Chain ID constants for EVM networks
 */
export const CHAIN_IDS = {
  // Mainnets
  ETHEREUM: 1,
  POLYGON: 137,
  CITREA: 4114,

  // Testnets
  CITREA_TESTNET: 5115,
  POLYGON_AMOY: 80002,
} as const;

/**
 * Maps currency symbols to their respective chain IDs.
 * Used to determine which chain a swap leg is on.
 */
export const SYMBOL_TO_CHAIN_ID: Record<string, number> = {
  // Polygon
  USDT_POLYGON: CHAIN_IDS.POLYGON,
  USDC_POLYGON: CHAIN_IDS.POLYGON,

  // Ethereum
  USDT_ETH: CHAIN_IDS.ETHEREUM,
  USDC_ETH: CHAIN_IDS.ETHEREUM,
  ETH: CHAIN_IDS.ETHEREUM,

  // Citrea Mainnet
  JUSD: CHAIN_IDS.CITREA,
  cBTC: CHAIN_IDS.CITREA,

  // Citrea Testnet (fallback for testnet symbols)
  JUSD_CITREA: CHAIN_IDS.CITREA,
};

/**
 * Get chain ID for a currency symbol.
 * Returns undefined if symbol is not an EVM currency (e.g., Lightning).
 */
export function getChainIdForSymbol(symbol: string): number | undefined {
  // Direct lookup
  if (SYMBOL_TO_CHAIN_ID[symbol]) {
    return SYMBOL_TO_CHAIN_ID[symbol];
  }

  // Try uppercase
  const upperSymbol = symbol.toUpperCase();
  if (SYMBOL_TO_CHAIN_ID[upperSymbol]) {
    return SYMBOL_TO_CHAIN_ID[upperSymbol];
  }

  // Check for known prefixes/patterns
  if (symbol.includes('POLYGON') || symbol.includes('_POLYGON')) {
    return CHAIN_IDS.POLYGON;
  }
  if (symbol.includes('ETH') && !symbol.includes('_')) {
    return CHAIN_IDS.ETHEREUM;
  }
  if (symbol.includes('CITREA') || symbol === 'JUSD' || symbol === 'cBTC') {
    return CHAIN_IDS.CITREA;
  }

  return undefined;
}
