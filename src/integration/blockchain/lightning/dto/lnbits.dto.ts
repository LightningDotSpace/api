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
  balance: number;
}

export interface LnBitsWalletDto {
  id: string;
  adminkey: string;
  name: string;
  balance: number;
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
