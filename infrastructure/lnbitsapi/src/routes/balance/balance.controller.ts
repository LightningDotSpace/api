import { NextFunction, Request, Response, Router } from 'express';
import { NotFoundException } from '../../http/exceptions/not-found.exception';
import { LnbitsApiLogger } from '../../shared/lnbitsapi-logger';
import { BalanceService } from './balance.service';

export class BalanceController {
  private readonly logger = new LnbitsApiLogger(BalanceController);

  private balanceService: BalanceService;

  constructor() {
    this.balanceService = new BalanceService();
  }

  router(): Router {
    return Router()
      .get('/balance', async (_req: Request, res: Response, next: NextFunction) => this.getBalance(res).catch(next))
      .get('/totalbalance', async (_req: Request, res: Response, next: NextFunction) =>
        this.getTotalBalance(res).catch(next),
      );
  }

  async getBalance(res: Response): Promise<void> {
    await this.balanceService
      .balance()
      .then((r) => res.json(r))
      .catch((e) => {
        this.logger.error('get balance failed', e);
        throw new NotFoundException('Balance not found');
      });
  }

  async getTotalBalance(res: Response): Promise<void> {
    await this.balanceService
      .totalBalance()
      .then((r) => res.json(r))
      .catch((e) => {
        this.logger.error('get total balance failed', e);
        throw new NotFoundException('Totalbalance not found');
      });
  }
}
