import { decode as lnurlDecode, encode as lnurlEncode } from 'lnurl';
import { Config } from 'src/config/config';
import { Util } from 'src/shared/utils/util';

export class LightningHelper {
  private static SAT_BTC_FACTOR: number = 10 ** 8;
  private static SAT_MSAT_FACTOR: number = 10 ** 3;

  // --- LNDHUB --- //
  static getLightningAddress(lnbitsAddress: string): string {
    return `${lnbitsAddress}@${Config.baseUrl}`;
  }

  static getLndhubUrl(type: string, key: string): string {
    return `lndhub://${type}:${key}@${Config.url}/lndhub`;
  }

  // --- LNURLp --- //
  static createLnbitsAddress(walletAddress: string): string {
    return Util.createHash(walletAddress, 'sha256', 'hex').slice(0, 6);
  }

  static createEncodedLnurlp(id: string): string {
    const url = `${Config.url}/lnurlp/${id}`;
    return this.encodeLnurl(url);
  }

  static createLnurlpCallbackUrl(id: string): string {
    return `${Config.url}/lnurlp/cb/${id}`;
  }

  // --- LNURL --- //
  static encodeLnurl(str: string): string {
    return lnurlEncode(str).toUpperCase();
  }

  static decodeLnurl(lnurl: string): string {
    return lnurlDecode(lnurl);
  }

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
