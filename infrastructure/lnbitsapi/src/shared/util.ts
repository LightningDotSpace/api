import { BinaryLike, BinaryToTextEncoding, KeyLike, createSign, createVerify } from 'crypto';

type CryptoAlgorithm = 'md5' | 'sha256' | 'sha512';

export class Util {
  static sum(list: number[]): number {
    return list.reduce((prev, curr) => prev + curr, 0);
  }

  static createSignature(
    data: BinaryLike,
    key: KeyLike,
    algo: CryptoAlgorithm = 'sha256',
    encoding: BinaryToTextEncoding = 'base64',
  ): string {
    const sign = createSign(algo);
    sign.update(data);
    return sign.sign(key, encoding);
  }

  static verifySignature(
    data: BinaryLike,
    key: KeyLike,
    signature: string,
    algo: CryptoAlgorithm = 'sha256',
    encoding: BinaryToTextEncoding = 'base64',
  ): boolean {
    const verify = createVerify(algo);
    verify.update(data);
    return verify.verify(key, signature, encoding);
  }
}
