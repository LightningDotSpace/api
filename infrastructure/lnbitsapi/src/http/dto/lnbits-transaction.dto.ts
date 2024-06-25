export interface LnBitsTransactionExtraTagDto {
  tag: string;
  link: string;
  extra: string;
}

export interface LnBitsTransactionExtraFiatDto {
  fiat_currency: string;
  fiat_amount: number;
  fiat_rate: number;
}

export type LnBitsTransactionExtraDto = LnBitsTransactionExtraTagDto | LnBitsTransactionExtraFiatDto | undefined;

export interface LnBitsTransactionDto {
  checking_id: string;
  pending: boolean;
  amount: number;
  fee: number;
  memo: string;
  time: number;
  bolt11: string;
  preimage: string;
  payment_hash: string;
  expiry: number;
  extra: LnBitsTransactionExtraDto;
  wallet_id: string;
  webhook: string;
  webhook_status: string;
}
