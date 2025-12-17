import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { WsAdapter } from '@nestjs/platform-ws';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as AppInsights from 'applicationinsights';
import cors from 'cors';
import { json, Request, Response } from 'express';
import helmet from 'helmet';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';
import morgan from 'morgan';
import { AppModule } from './app.module';
import { Config } from './config/config';
import { ApiExceptionFilter } from './shared/filters/exception.filter';
import { LightningLogger } from './shared/services/lightning-logger';

async function bootstrap() {
  if (process.env.APPINSIGHTS_INSTRUMENTATIONKEY) {
    AppInsights.setup().setAutoDependencyCorrelation(true).setAutoCollectConsole(true, true);
    AppInsights.defaultClient.context.tags[AppInsights.defaultClient.context.keys.cloudRole] = 'lds-api';
    AppInsights.start();
  }

  const app = await NestFactory.create(AppModule);

  app.use(morgan('dev'));
  app.use(helmet());
  app.use(cors());

  app.use('*', json({ type: 'application/json', limit: '10mb' }));

  app.setGlobalPrefix(Config.version, { exclude: ['', '.well-known/(.*)'] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.useGlobalFilters(new ApiExceptionFilter());

  app.useWebSocketAdapter(new WsAdapter(app));

  // --- REWRITE SWAP URL --- //
  if (Config.swap.apiUrl) {
    const rewriteUrl = `/${Config.version}/swap`;

    const forwardProxy = createProxyMiddleware<Request, Response>({
      target: Config.swap.apiUrl,
      changeOrigin: true,
      ws: true,
      toProxy: true,
      secure: false,
      pathRewrite: { [rewriteUrl]: '' },
      on: {
        proxyReq(proxyReq, req: Request) {
          // remove port from IP (not supported by Boltz backend)
          if (req.ip) proxyReq.setHeader('X-Forwarded-For', req.ip.split(':')[0]);

          fixRequestBody(proxyReq, req);
        },
      },
    });
    app.use(rewriteUrl, forwardProxy);

    const server = app.getHttpServer();
    server.on('upgrade', forwardProxy.upgrade);
  }

  // --- REWRITE BOLTZ CLAIM URL --- //
  if (Config.boltzClaim.apiUrl) {
    const rewriteUrl = `/${Config.version}/boltz-claim`;
    const forwardProxy = createProxyMiddleware<Request, Response>({
      target: Config.boltzClaim.apiUrl,
      changeOrigin: true,
      toProxy: true,
      secure: false,
      pathRewrite: { [rewriteUrl]: '' },
      on: {
        proxyReq(proxyReq, req: Request) {
          if (req.ip) proxyReq.setHeader('X-Forwarded-For', req.ip.split(':')[0]);
          fixRequestBody(proxyReq, req);
        },
      },
    });
    app.use(rewriteUrl, forwardProxy);
  }

  // --- SWAGGER --- //
  const swaggerOptions = new DocumentBuilder()
    .setTitle('lightning.space API')
    .setDescription(
      `lightning.space API ${Config.environment.toUpperCase()} (updated on ${new Date().toLocaleString()})`,
    )
    .setVersion(Config.version)
    .addBearerAuth()
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerOptions);
  SwaggerModule.setup('/swagger', app, swaggerDocument);

  await app.listen(Config.port);

  new LightningLogger('Main').info(`Application ready ...`);
}

void bootstrap();
