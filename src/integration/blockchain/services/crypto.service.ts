import { Injectable } from '@nestjs/common';
import { verify } from 'bitcoinjs-message';
import { isEthereumAddress } from 'class-validator';
import { verifyMessage } from 'ethers/lib/utils';
import { Config } from 'src/config/config';
import { Blockchain } from 'src/shared/enums/blockchain.enum';

@Injectable()
export class CryptoService {
  // --- ADDRESSES --- //
  public getBlockchainsBasedOn(address: string): Blockchain {
    if (isEthereumAddress(address)) return Blockchain.ETHEREUM;
    if (this.isBitcoinAddress(address)) return Blockchain.BITCOIN;
    return Blockchain.BITCOIN;
  }

  private isBitcoinAddress(address: string): boolean {
    return RegExp(`^(${Config.bitcoinAddressFormat})$`).test(address);
  }

  // --- SIGNATURE VERIFICATION --- //
  public verifySignature(message: string, address: string, signature: string): boolean {
    const blockchain = this.getBlockchainsBasedOn(address);

    try {
      if (blockchain === Blockchain.ETHEREUM) return this.verifyEthereumBased(message, address, signature);
      if (blockchain === Blockchain.BITCOIN) return this.verifyBitcoinBased(message, address, signature, undefined);
    } catch {}

    return false;
  }

  private verifyEthereumBased(message: string, address: string, signature: string): boolean {
    // there are signatures out there, which do not have '0x' in the beginning, but for verification this is needed
    const signatureToUse = signature.startsWith('0x') ? signature : '0x' + signature;
    return verifyMessage(message, signatureToUse).toLowerCase() === address.toLowerCase();
  }

  private verifyBitcoinBased(message: string, address: string, signature: string, prefix: string | undefined): boolean {
    let isValid = false;
    try {
      isValid = verify(message, address, signature, prefix, true);
    } catch {}

    if (!isValid) isValid = verify(message, address, signature, prefix);

    return isValid;
  }
}
