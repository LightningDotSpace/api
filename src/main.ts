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
  if (process.env.SWAP_API_URL) {
    const rewriteUrl = `/${Config.version}/swap`;

    const forwardProxy = createProxyMiddleware<Request, Response>({
      target: process.env.SWAP_API_URL,
      changeOrigin: true,
      ws: true,
      toProxy: true,
      secure: false,
      pathRewrite: { [rewriteUrl]: '' },
      on: {
        proxyReq(proxyReq, req: Request) {
          let clientIp = req.ip;
          if (clientIp.includes(':')) {
            clientIp = clientIp.split(':')[0];
          }

          proxyReq.setHeader('X-Forwarded-For', clientIp);

          fixRequestBody(proxyReq, req);
        },
      },
    });
    app.use(rewriteUrl, forwardProxy);

    const server = app.getHttpServer();
    server.on('upgrade', forwardProxy.upgrade);
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
