import { Wallet } from '../../domain/entities/wallet.entity';
import { WalletDto } from './wallet.dto';

export class WalletMapper {
  static toDto(wallet: Wallet): WalletDto {
    const dto: WalletDto = {
      address: wallet.address,
      lnbitsUserId: wallet.lnbitsUserId,
    };

    return Object.assign(new WalletDto(), dto);
  }
}
