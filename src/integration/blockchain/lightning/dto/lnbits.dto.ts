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
  user: {
    id: string;
    name: string;
  };
  wallet: {
    id: string;
    name: string;
    adminkey: string;
    inkey: string;
  };
  lnurlp: {
    id: string;
    description: string;
    username: string;
  };
}
