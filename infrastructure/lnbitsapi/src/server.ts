import * as bodyParser from 'body-parser';
import express, { NextFunction, Request, Response } from 'express';
import * as https from 'https';
import { HttpException, HttpStatus } from './http/exceptions/http.exception';
import { JobRegistry } from './jobs/enums/job-registry';
import { RouteController } from './routes/route.controller';
import { Config } from './shared/config';
import { LnbitsApiLogger } from './shared/lnbitsapi-logger';
import { TimerRegistry } from './timer/timer-registry';

// --- LOGGER --- //
const logger = new LnbitsApiLogger('Server');

// --- JOBS --- //
JobRegistry.setup();

// --- APP --- //
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(new RouteController().router());

app.get('/', (_req: Request, res: Response) => {
  res.json({ status: `API is running on /api/${Config.version}/...` });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  const message = err.message;
  const status = err instanceof HttpException ? err.status : HttpStatus.INTERNAL_SERVER_ERROR;
  logger.error(`HTTP Error ${status}: ${err.message}`);

  res.status(status).json({ status, message });
});

// --- APP STARTUP --- //
const port = Config.port;
const host = Config.host;
const credentials = { key: Config.httpSignature.privKey, cert: Config.httpSignature.pubKey };

const server = https.createServer(credentials, app);

server.listen(port, host, () => {
  logger.info(`HTTPS server is running on port ${port}`);

  JobRegistry.startJobs();
});

// --- APP SHUTDOWN --- //
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGHUP', () => shutdown('SIGHUP'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGQUIT', () => shutdown('SIGQUIT'));

function shutdown(signal: NodeJS.Signals) {
  logger.info(`${signal} signal received: closing HTTPS server`);

  TimerRegistry.stopTimers();
  JobRegistry.stopJobs();

  server.close(() => {
    logger.info('HTTPS server closed');
  });
}
