import { Currency } from '@uma-sdk/core';
import { PaymentRequestMethod } from 'src/subdomains/payment-request/entities/payment-request.entity';

export interface LnbitsUsermanagerUserDto {
  id: string;
  name: string;
  admin: string;
  email?: string;
  password?: string;

  wallets?: LnBitsUsermanagerWalletDto[];
}

export interface LnBitsUsermanagerWalletDto {
  id: string;
  admin: string;
  name: string;
  user: string;
  adminkey: string;
  inkey: string;
}

export interface LnBitsWalletDto {
  id: string;
  adminkey: string;
  name: string;
  balance: number;
}

export interface LnBitsWalletBalanceDto {
  wallet: string;
  balance: number;
}

export interface LnBitsTotalBalanceDto {
  balance: number;
}

export interface LnBitsWalletPaymentDto {
  payment_hash: string;
  payment_request: string;
  checking_id: string;
  lnurl_response: string;
}

export interface LnBitsTransactionWebhookTransferDto {
  changed: LnBitsTransactionDto[];
  deleted: string[];
}

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

export function isLnBitsTransactionExtraTag(extra: LnBitsTransactionExtraDto): extra is LnBitsTransactionExtraTagDto {
  return (extra as LnBitsTransactionExtraTagDto).tag !== undefined;
}

export function isLnBitsTransactionExtraFiat(extra: LnBitsTransactionExtraDto): extra is LnBitsTransactionExtraFiatDto {
  return (extra as LnBitsTransactionExtraFiatDto).fiat_currency !== undefined;
}

export interface LnBitsLnurlpLinkDto {
  id?: string;
  wallet?: string;
  description: string;
  min: number;
  served_meta?: number;
  served_pr?: number;
  username?: string;
  domain?: string;
  webhook_url?: string;
  webhook_headers?: string;
  webhook_body?: string;
  success_text?: string;
  success_url?: string;
  currency?: string;
  comment_chars: number;
  max: number;
  fiat_base_multiplier: number;
  zaps?: boolean;
  lnurl?: string;
}

export interface LnBitsLnurlpLinkRemoveDto {
  success: boolean;
}

export interface LnBitsUserDto {
  id: string;
  name: string;
  address: string;
  addressSignature: string;
  wallets: [
    {
      wallet: LnBitsUsermanagerWalletDto;
      lnurlp: LnBitsLnurlpLinkDto;
    },
  ];
}

export interface LnBitsLnurlPayRequestDto {
  tag: string;
  callback: string;
  minSendable: number;
  maxSendable: number;
  metadata: string;
  currencies: Currency[];
  methods: PaymentRequestMethod[];
}

export interface LnBitsLnurlpInvoiceDto {
  pr: string;
  routes: [];
}

export interface LnBitsLnurlWithdrawRequestDto {
  tag: string;
  callback: string;
  k1: string;
  minWithdrawable: number;
  maxWithdrawable: number;
  defaultDescription: string;
}

export interface LnBitsLnurlwInvoiceDto {
  status: string;
  reason: string;
}

export interface LnBitsLnurlwLinkDto {
  id?: string;
  wallet?: string;
  title: string;
  min_withdrawable: number;
  max_withdrawable: number;
  uses: number;
  wait_time: number;
  is_unique: boolean;
  unique_hash?: string;
  k1?: string;
  open_time?: number;
  used?: number;
  usescsv?: string;
  number?: number;
  webhook_url?: string;
  webhook_headers?: string;
  webhook_body?: string;
  custom_url?: string;
  lnurl?: string;
}
