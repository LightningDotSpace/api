import { Router } from 'express';
import { Config } from '../shared/config';
import { BalanceController } from './balance/balance.controller';

export class RouteController {
  router(): Router {
    const api = Router().use(new BalanceController().router());

    return Router().use(`/api/${Config.version}`, api);
  }
}
