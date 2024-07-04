export type LnBitsCompareDto = LNbitsBoltcardCompareDto | LNbitsApiPaymentCompareDto;

export interface LNbitsBoltcardCompareDto {
  id: string;
  hash: string;
}

export interface LNbitsApiPaymentCompareDto {
  wallet_id: string;
  checking_id: string;
  hash: string;
}
