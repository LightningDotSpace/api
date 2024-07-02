export interface BoltCardAuthDto {
  card_name: string;
  id: string;
  k0: string;
  k1: string;
  k2: string;
  k3: string;
  k4: string;
  lnurlw_base: string;
  protocol_name: string;
  protocol_version: string;
}

export interface BoltcardScanDto {
  tag: string;
  callback: string;
  k1: string;
  minWithdrawable: number;
  maxWithdrawable: number;
  defaultDescription: string;
  payLink: string;
}

export interface BoltcardLnurlPayDto {
  tag: string;
  callback: string;
  metadata: string;
  minSendable: number;
  maxSendable: number;
}

export interface BoltcardWebhookTransferDto {
  changed: BoltcardInfoDto[];
  deleted: string[];
}

export interface BoltcardInfoDto {
  id: string;
  wallet: string;
  card_name: string;
  uid: string;
  external_id: string;
  counter: number;
  tx_limit: number;
  daily_limit: number;
  enable: boolean;
  k0: string;
  k1: string;
  k2: string;
  prev_k0: string;
  prev_k1: string;
  prev_k2: string;
  otp: string;
  time: number;
}
