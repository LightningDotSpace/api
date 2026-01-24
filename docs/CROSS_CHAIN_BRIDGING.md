# Cross-Chain Bridging & Arbitrage

**How JUSD maintains its peg through cross-chain infrastructure connecting Ethereum, Citrea, and Lightning Network.**

## Overview

JuiceDollar (JUSD) on Citrea is connected to other networks through multiple bridging mechanisms. This enables:

1. **Price stability** through arbitrage opportunities
2. **Liquidity access** to major stablecoin markets
3. **Fast settlements** via Lightning Network

The combination of Layer0 cross-chain messaging and Lightning.space atomic swaps creates a complete arbitrage loop that helps maintain the JUSD peg.

## Bridge Architecture

```
    ETHEREUM                           CITREA
┌──────────────────┐               ┌───────────────────────┐
│                  │               │                       │
│      USDT        │───Layer0────▶│      USDT.e           │
│  0xdAC17F958...  │               │  0x9f3096Bac...       │
│                  │               │         │             │
└────────▲─────────┘               │         ▼             │
         │                         │  StablecoinBridge     │
         │                         │         │             │
         │                         │         ▼             │
         │    Lightning.space      │       JUSD            │
         └─────────────────────────│                       │
               (Atomic Swap)       └───────────────────────┘
```

## Layer0 (LayerZero) Bridges

LayerZero provides omnichain messaging to bridge assets between Ethereum and Citrea.

### Ethereum → Citrea Bridges

| Asset | Ethereum Contract | Citrea Contract | Type |
|-------|-------------------|-----------------|------|
| **USDT** | [`0x6925ccD29e3993c82a574CED4372d8737C6dbba6`](https://etherscan.io/address/0x6925ccD29e3993c82a574CED4372d8737C6dbba6) | [`0x9f3096Bac87e7F03DC09b0B416eB0DF837304dc4`](https://explorer.mainnet.citrea.xyz/address/0x9f3096Bac87e7F03DC09b0B416eB0DF837304dc4) | SourceOFTAdapter → USDT.e |
| **USDC** | [`0xdaa289CC487Cf95Ba99Db62f791c7E2d2a4b868E`](https://etherscan.io/address/0xdaa289CC487Cf95Ba99Db62f791c7E2d2a4b868E) | [`0xE045e6c36cF77FAA2CfB54466D71A3aEF7bBE839`](https://explorer.mainnet.citrea.xyz/address/0xE045e6c36cF77FAA2CfB54466D71A3aEF7bBE839) | SourceOFTAdapter → USDC.e |
| **WBTC** | [`0x2c01390E10e44C968B73A7BcFF7E4b4F50ba76Ed`](https://etherscan.io/address/0x2c01390E10e44C968B73A7BcFF7E4b4F50ba76Ed) | [`0xDF240DC08B0FdaD1d93b74d5048871232f6BEA3d`](https://explorer.mainnet.citrea.xyz/address/0xDF240DC08B0FdaD1d93b74d5048871232f6BEA3d) | WBTCOFTAdapter → WBTC.e |

### Bridge Contracts on Citrea

| Contract | Address | Purpose |
|----------|---------|---------|
| USDC.e Token | [`0xE045e6c36cF77FAA2CfB54466D71A3aEF7bBE839`](https://explorer.mainnet.citrea.xyz/address/0xE045e6c36cF77FAA2CfB54466D71A3aEF7bBE839) | Bridged USDC from Ethereum |
| USDC.e Bridge | [`0x41710804caB0974638E1504DB723D7bddec22e30`](https://explorer.mainnet.citrea.xyz/address/0x41710804caB0974638E1504DB723D7bddec22e30) | DestinationOUSDC |
| USDT.e Token | [`0x9f3096Bac87e7F03DC09b0B416eB0DF837304dc4`](https://explorer.mainnet.citrea.xyz/address/0x9f3096Bac87e7F03DC09b0B416eB0DF837304dc4) | Bridged USDT from Ethereum |
| USDT.e Bridge | [`0xF8b5983BFa11dc763184c96065D508AE1502C030`](https://explorer.mainnet.citrea.xyz/address/0xF8b5983BFa11dc763184c96065D508AE1502C030) | DestinationOUSDT |
| WBTC.e + Bridge | [`0xDF240DC08B0FdaD1d93b74d5048871232f6BEA3d`](https://explorer.mainnet.citrea.xyz/address/0xDF240DC08B0FdaD1d93b74d5048871232f6BEA3d) | WBTCOFT (combined) |

### Source Token Verification

All bridges use the **official Ethereum token contracts**:

| Token | Ethereum Address | Decimals |
|-------|------------------|----------|
| USDT (Tether) | [`0xdAC17F958D2ee523a2206206994597C13D831ec7`](https://etherscan.io/address/0xdAC17F958D2ee523a2206206994597C13D831ec7) | 6 |
| USDC (Circle) | [`0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`](https://etherscan.io/address/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48) | 6 |
| WBTC | [`0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599`](https://etherscan.io/address/0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599) | 8 |

## Lightning.space Swaps

Lightning.space provides atomic swaps between Ethereum stablecoins and JUSD on Citrea via the Lightning Network.

### Swap Pairs

#### USDT Pairs

| From | To | Direction | Min | Max |
|------|-----|-----------|-----|-----|
| ETH USDT | Citrea USDT/JUSD | Chain Swap | 1 USDT | 10,000 USDT |
| Citrea USDT/JUSD | ETH USDT | Reverse Swap | 1 USDT | 10,000 USDT |
| Polygon USDT | Citrea USDT/JUSD | Chain Swap | 1 USDT | 10,000 USDT |
| Citrea USDT/JUSD | Polygon USDT | Reverse Swap | 1 USDT | 10,000 USDT |

#### USDC Pairs (Ethereum only)

| From | To | Direction | Min | Max |
|------|-----|-----------|-----|-----|
| ETH USDC | Citrea USDC/JUSD | Chain Swap | 1 USDC | 10,000 USDC |
| Citrea USDC/JUSD | ETH USDC | Reverse Swap | 1 USDC | 10,000 USDC |

> **Note:** Polygon USDC is not supported due to bridge incompatibility (native USDC vs bridged USDC.e).

### Contract Addresses

#### Ethereum Mainnet

| Contract | Address |
|----------|---------|
| EtherSwap | [`0x9ADfB0F1B783486289Fc23f3A3Ad2927cebb17e4`](https://etherscan.io/address/0x9ADfB0F1B783486289Fc23f3A3Ad2927cebb17e4) |
| ERC20Swap | [`0x2E21F58Da58c391F110467c7484EdfA849C1CB9B`](https://etherscan.io/address/0x2E21F58Da58c391F110467c7484EdfA849C1CB9B) |
| USDT Token | [`0xdAC17F958D2ee523a2206206994597C13D831ec7`](https://etherscan.io/address/0xdAC17F958D2ee523a2206206994597C13D831ec7) |
| USDC Token | [`0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`](https://etherscan.io/address/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48) |

#### Polygon Mainnet

| Contract | Address |
|----------|---------|
| EtherSwap | [`0x9ADfB0F1B783486289Fc23f3A3Ad2927cebb17e4`](https://polygonscan.com/address/0x9ADfB0F1B783486289Fc23f3A3Ad2927cebb17e4) |
| ERC20Swap | [`0x2E21F58Da58c391F110467c7484EdfA849C1CB9B`](https://polygonscan.com/address/0x2E21F58Da58c391F110467c7484EdfA849C1CB9B) |
| USDT Token | [`0xc2132D05D31c914a87C6611C10748AEb04B58e8F`](https://polygonscan.com/address/0xc2132D05D31c914a87C6611C10748AEb04B58e8F) |

#### Citrea Mainnet

| Contract | Address |
|----------|---------|
| EtherSwap | [`0xd02731fD8c5FDD53B613A699234FAd5EE8851B65`](https://explorer.mainnet.citrea.xyz/address/0xd02731fD8c5FDD53B613A699234FAd5EE8851B65) |
| ERC20Swap | [`0xf2e019a371e5Fd32dB2fC564Ad9eAE9E433133cc`](https://explorer.mainnet.citrea.xyz/address/0xf2e019a371e5Fd32dB2fC564Ad9eAE9E433133cc) |
| USDT_CITREA | [`0x1Dd3057888944ff1f914626aB4BD47Dc8b6285Fe`](https://explorer.mainnet.citrea.xyz/address/0x1Dd3057888944ff1f914626aB4BD47Dc8b6285Fe) |
| USDC_CITREA | [`0xE045e6c36cF77FAA2CfB54466D71A3aEF7bBE839`](https://explorer.mainnet.citrea.xyz/address/0xE045e6c36cF77FAA2CfB54466D71A3aEF7bBE839) |

### Token Compatibility

Lightning.space uses the **same Ethereum token contracts** as Layer0:

```
Ethereum USDT: 0xdAC17F958D2ee523a2206206994597C13D831ec7
Ethereum USDC: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
```

This ensures that tokens bridged via Layer0 can be used in Lightning.space swaps and vice versa.

## StablecoinBridge: USDT.e → JUSD

A StablecoinBridge contract can connect Layer0's USDT.e to JUSD on Citrea.

### How It Works

```solidity
// Deposit USDT.e, receive JUSD (1:1)
function mint(uint256 amount) external

// Burn JUSD, receive USDT.e (1:1)
function burn(uint256 amount) external
```

The bridge automatically handles decimal conversion:
- USDT.e: 6 decimals
- JUSD: 18 decimals

### Planned Deployment

| Parameter | Value |
|-----------|-------|
| Source Token | USDT.e (`0x9f3096Bac87e7F03DC09b0B416eB0DF837304dc4`) |
| Target Token | JUSD |
| Exchange Rate | 1:1 |
| Network | Citrea Mainnet |

## The Arbitrage Loop

With all components in place, arbitrageurs can close the loop:

### Loop 1: JUSD → ETH USDT → USDT.e → JUSD

```
Step 1: Burn JUSD via StablecoinBridge
        → Receive USDT.e on Citrea

Step 2: Bridge USDT.e to Ethereum via Layer0
        → Receive USDT on Ethereum

Step 3: Swap USDT to JUSD via Lightning.space
        → Receive JUSD on Citrea
```

### Loop 2: JUSD → ETH USDT via Lightning → USDT.e → JUSD

```
Step 1: Swap JUSD to USDT via Lightning.space
        → Receive USDT on Ethereum

Step 2: Bridge USDT to Citrea via Layer0
        → Receive USDT.e on Citrea

Step 3: Mint JUSD via StablecoinBridge
        → Receive JUSD on Citrea
```

### Economic Implications

| Scenario | Arbitrage Action | Effect on JUSD |
|----------|------------------|----------------|
| JUSD > $1 | Mint JUSD from USDT.e, sell for profit | Increases supply, price decreases |
| JUSD < $1 | Buy cheap JUSD, burn for USDT.e | Decreases supply, price increases |

This creates a self-correcting mechanism that maintains the JUSD peg.

## Fee Structure

### Layer0 Bridge Fees

- Gas fees on source chain (Ethereum)
- LayerZero messaging fees
- Gas fees on destination chain (Citrea)

### Lightning.space Swap Fees

| Swap Type | Fee |
|-----------|-----|
| Chain Swap (USDT → JUSD) | 0.25% |
| Reverse Swap (JUSD → USDT) | 0.5% |

### StablecoinBridge Fees

- **No protocol fees** for mint/burn
- Only gas costs on Citrea (paid in cBTC)

## Security Considerations

### Bridge Risks

| Risk | Mitigation |
|------|------------|
| Layer0 bridge exploit | Multiple security audits, decentralized validation |
| Lightning.space failure | Non-custodial atomic swaps, timeout refunds |
| StablecoinBridge exploit | Volume limits, time-based expiration, emergency stop |
| USDT depeg | Volume limits, governance veto power |

### Best Practices

1. **Verify contract addresses** before large transactions
2. **Check bridge liquidity** on both sides
3. **Monitor gas costs** - arbitrage must exceed fees
4. **Use official frontends** to avoid phishing

## API Endpoints

### Lightning.space

| Environment | Base URL |
|-------------|----------|
| Production | `https://lightning.space/v1/swap/` |
| Development | `https://dev.lightning.space/v1/swap/` |

### Citrea RPC

| Environment | RPC URL |
|-------------|---------|
| Mainnet | `https://rpc.citrea.xyz` |
| Testnet | `https://rpc.testnet.citrea.xyz` |

## Summary

The cross-chain infrastructure enables:

1. **Ethereum ↔ Citrea** via Layer0 (USDT, USDC, WBTC)
2. **Ethereum ↔ Citrea JUSD** via Lightning.space (atomic swaps)
3. **USDT.e ↔ JUSD** via StablecoinBridge (on-chain, 1:1)

Together, these create a robust arbitrage mechanism that keeps JUSD pegged to $1.

### Component Status

| Component | Status | Contract Verified |
|-----------|--------|-------------------|
| Layer0 USDT Bridge | Live | Yes |
| Layer0 USDC Bridge | Live | Yes |
| Layer0 WBTC Bridge | Live | Yes |
| Lightning.space Swaps | Live | Yes |
| StablecoinBridge (USDT.e) | Planned | - |
