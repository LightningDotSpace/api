import { Injectable } from '@nestjs/common';
import { verify } from 'bitcoinjs-message';

@Injectable()
export class CryptoService {
  // --- SIGNATURE VERIFICATION --- //
  public verifySignature(message: string, address: string, signature: string): boolean {
    try {
      let isValid = false;
      try {
        isValid = verify(message, address, signature, undefined, true);
      } catch {}

      if (!isValid) isValid = verify(message, address, signature, undefined);

      return isValid;
    } catch {}

    return false;
  }
}
