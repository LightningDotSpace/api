import { ApiProperty } from '@nestjs/swagger';
import { Blockchain } from 'src/shared/enums/blockchain.enum';

export enum Direction {
  OUTGOING = 'outgoing',
  INCOMING = 'incoming'
}

export class BalanceDto {
  @ApiProperty({ description: 'Blockchain/Network', enum: Blockchain })
  blockchain: Blockchain;

  @ApiProperty({ description: 'Asset symbol (e.g. BTC, cBTC, JUSD, USDC, USDT, WBTC)' })
  asset: string;

  @ApiProperty({ description: 'Balance amount' })
  balance: number;

  @ApiProperty({ description: 'Direction (only for Lightning)', required: false, enum: Direction })
  direction?: Direction;
}

