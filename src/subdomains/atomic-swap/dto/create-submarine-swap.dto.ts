import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber } from 'class-validator';

export class CreateSubmarineSwapDto {
  @IsString()
  @IsNotEmpty()
  invoice: string;

  @IsString()
  @IsNotEmpty()
  refundPublicKey: string;

  @IsOptional()
  @IsString()
  pairId?: string = 'BTC/BTC';

  @IsOptional()
  @IsString()
  orderSide?: 'buy' | 'sell' = 'buy';

  @IsOptional()
  channel?: {
    auto: boolean;
    private: boolean;
    inboundLiquidity: number;
  };
}

export class CreateReverseSwapDto {
  @IsNumber()
  @IsNotEmpty()
  invoiceAmount: number;

  @IsString()
  @IsNotEmpty()
  preimageHash: string;

  @IsString()
  @IsNotEmpty()
  claimPublicKey: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  addressSignature?: string;

  @IsOptional()
  @IsString()
  pairId?: string = 'BTC/BTC';

  @IsOptional()
  @IsString()
  orderSide?: 'buy' | 'sell' = 'sell';
}
