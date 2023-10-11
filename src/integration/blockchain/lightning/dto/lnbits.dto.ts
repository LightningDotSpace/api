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
  extra: {
    tag: string;
    link: string;
    extra: string;
  };
  wallet_id: string;
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
}

export interface LnBitsLnurlpInvoiceDto {
  pr: string;
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
