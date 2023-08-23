import { Util } from 'src/shared/utils/util';

export class LightningHelper {
  private static SAT_BTC_FACTOR: number = 10 ** 8;
  private static SAT_MSAT_FACTOR: number = 10 ** 3;

  // --- CONVERT --- /
  static btcToSat(btcAmount: number): number {
    return Util.round(btcAmount * LightningHelper.SAT_BTC_FACTOR, 3);
  }

  static satToMsat(satAmount: number): number {
    return Util.round(satAmount * LightningHelper.SAT_MSAT_FACTOR, 0);
  }

  static btcToMsat(btcAmount: number): number {
    return Util.round(LightningHelper.satToMsat(LightningHelper.btcToSat(btcAmount)), 0);
  }

  static msatToSat(msatAmount: number): number {
    return Util.round(msatAmount / LightningHelper.SAT_MSAT_FACTOR, 3);
  }

  static satToBtc(satAmount: number): number {
    return Util.round(satAmount / LightningHelper.SAT_BTC_FACTOR, 12);
  }

  static msatToBtc(msatAmount: number): number {
    return Util.round(LightningHelper.satToBtc(LightningHelper.msatToSat(msatAmount)), 12);
  }
}
