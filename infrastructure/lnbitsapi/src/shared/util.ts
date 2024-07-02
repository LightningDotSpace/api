import { BinaryLike, BinaryToTextEncoding, KeyLike, createHash, createSign, createVerify } from 'crypto';
import { createReadStream } from 'fs';

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

  static createHash(
    data: BinaryLike,
    algo: CryptoAlgorithm = 'sha256',
    encoding: BinaryToTextEncoding = 'hex',
  ): string {
    const hash = createHash(algo);
    hash.update(data);
    return hash.digest(encoding);
  }

  static async createFileHash(
    filepath: string,
    algo: CryptoAlgorithm = 'sha256',
    encoding: BinaryToTextEncoding = 'hex',
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = createHash(algo);

      try {
        createReadStream(filepath)
          .on('data', (data) => {
            hash.update(data);
          })
          .on('end', () => {
            return resolve(hash.digest(encoding));
          });
      } catch {
        return reject(new Error('Cannot create file hash'));
      }
    });
  }
}
