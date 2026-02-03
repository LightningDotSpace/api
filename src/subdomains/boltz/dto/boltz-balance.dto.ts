import { ApiProperty } from '@nestjs/swagger';
import { Blockchain } from 'src/shared/enums/blockchain.enum';

export class BalanceDto {
  @ApiProperty({ description: 'Blockchain/Network', enum: Blockchain })
  blockchain: Blockchain;

  @ApiProperty({ description: 'Asset symbol (e.g. BTC, cBTC, JUSD, USDC, USDT, WBTC)' })
  asset: string;

  @ApiProperty({ description: 'Balance amount' })
  balance: number;

  @ApiProperty({ description: 'Direction (only for Lightning)', required: false, enum: ['outgoing', 'incoming'] })
  direction?: 'outgoing' | 'incoming';
}

export class BoltzBalanceResponseDto {
  @ApiProperty({ description: 'Wallet address' })
  address: string;

  @ApiProperty({ description: 'BTC onchain balances', type: [BalanceDto] })
  btc: BalanceDto[];

  @ApiProperty({ description: 'Lightning network balances', type: [BalanceDto] })
  lightning: BalanceDto[];

  @ApiProperty({ description: 'EVM chain balances', type: [BalanceDto] })
  evm: BalanceDto[];
}
