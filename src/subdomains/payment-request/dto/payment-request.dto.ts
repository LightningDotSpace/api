import { Blockchain } from 'src/shared/enums/blockchain.enum';

export type PaymentRequestDto = LightningPaymentRequestDto | EvmPaymentRequestDto;

export class LightningPaymentRequestDto {
  pr: string;
}

export class EvmPaymentRequestDto {
  expiryDate: Date;
  pr: EvmPaymentUriDto[];
}

export class EvmPaymentUriDto {
  blockchain: Blockchain;
  uri: string;
}

export function isLightning(type: PaymentRequestDto): type is LightningPaymentRequestDto {
  return type instanceof LightningPaymentRequestDto;
}

export function isEvm(type: PaymentRequestDto): type is EvmPaymentRequestDto {
  return type instanceof EvmPaymentRequestDto;
}
