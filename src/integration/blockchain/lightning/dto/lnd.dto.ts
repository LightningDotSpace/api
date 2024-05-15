export interface LndInfoDto {
  version: string;
  identity_pubkey: string;
  num_active_channels: number;
  block_height: number;
  synced_to_chain: boolean;
}

export interface LndInvoiceInfoDto {
  description: string;
  publicKey: string;
  sats: number;
  expiryDate: Date;
}

export interface LndWalletBalanceDto {
  total_balance: number;
  confirmed_balance: number;
  unconfirmed_balance: number;
  locked_balance: number;
}

export interface LndChannelBalanceDto {
  balance: number;
  pending_open_balance: number;
  local_balance: { sat: number };
  remote_balance: { sat: number };
}

export interface LndChannelDto {
  active: boolean;
  local_balance: string;
  commit_fee: string;
  local_chan_reserve_sat: string;
}

// https://lightning.engineering/api-docs/api/lnd/lightning/get-transactions
export interface LndOnchainTransactionDto {
  tx_hash: string;
  amount: string;
  block_height: number;
  time_stamp: string;
  total_fees: string;
}

// https://lightning.engineering/api-docs/api/lnd/lightning/list-invoices
export interface LndInvoiceResponseDto {
  invoices: LndInvoiceDto[];
  first_index_offset: string;
  last_index_offset: string;
}

export interface LndInvoiceDto {
  r_hash: string;
  r_preimage: string;
  value: string;
  creation_date: string;
  expiry: string;
  settle_date: string;
  state: string;
  memo: string;
  payment_request: string;
}

// https://lightning.engineering/api-docs/api/lnd/lightning/list-payments
export interface LndPaymentResponseDto {
  payments: LndPaymentDto[];
  first_index_offset: string;
  last_index_offset: string;
}

export interface LndPaymentDto {
  payment_hash: string;
  payment_preimage: string;
  value_sat: string;
  fee_sat: string;
  creation_time_ns: string;
  status: string;
  failure_reason: string;
  payment_request: string;
}

// https://lightning.engineering/api-docs/api/lnd/lightning/forwarding-history
export interface LndRoutingResponseDto {
  forwarding_events: LndRoutingDto[];
  last_offset_index: number;
}

export interface LndRoutingDto {
  chan_id_in: string;
  chan_id_out: string;
  amt_in_msat: string;
  amt_out_msat: string;
  fee_msat: string;
  timestamp_ns: string;
}

export interface LndTransactionResponseDto {
  transactions: LndTransactionDto[];
  last_index_offset: number;
}

export interface LndTransactionDto {
  state: string;
  transaction: string;
  secret: string;
  amount: number;
  fee: number;
  creationTimestamp: Date;
  expiresTimestamp?: Date;
  confirmedTimestamp?: Date;
  description?: string;
  reason?: string;
  paymentRequest?: string;
}
