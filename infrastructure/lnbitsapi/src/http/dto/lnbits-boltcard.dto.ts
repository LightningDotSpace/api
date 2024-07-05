export interface LnBitsBoltcardDto {
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
