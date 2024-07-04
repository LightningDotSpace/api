import { DBService } from '../../database/sqlite.service';
import { Config } from '../../shared/config';
import { Util } from '../../shared/util';
import { BalanceDto, TotalBalanceDto } from './balance.dto';

export class BalanceService {
  async balance(): Promise<BalanceDto[]> {
    const walletIds = await this.userWallets('BTC');

    const allBalances = await DBService.selectAll<BalanceDto[]>(
      Config.sqlite.mainDB,
      'SELECT wallet, balance FROM balances',
    );

    return allBalances.filter((b) => walletIds.includes(b.wallet));
  }

  async totalBalance(): Promise<TotalBalanceDto> {
    const walletIds = await this.userWallets('BTC');

    const allBalances = await DBService.selectAll<BalanceDto[]>(
      Config.sqlite.mainDB,
      'SELECT wallet, balance FROM balances',
    );

    const adminUserBalances = allBalances.filter((b) => walletIds.includes(b.wallet));

    const totalBalance = Util.sum(adminUserBalances.map((b) => b.balance));

    return { balance: totalBalance };
  }

  private async userWallets(walletName: string): Promise<string[]> {
    const walletIds = await DBService.selectAll<{ id: string }[]>(
      Config.sqlite.usermanagerDB,
      `SELECT w.id FROM users u LEFT JOIN wallets w ON u.id = w.user WHERE u.admin = w.admin AND u.admin = '${Config.walletAdminUser}' AND w.name='${walletName}'`,
    );

    return walletIds.map((r) => r.id);
  }
}
