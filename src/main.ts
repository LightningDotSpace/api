import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as AppInsights from 'applicationinsights';
import cors from 'cors';
import { json } from 'express';
import helmet from 'helmet';
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

  app.setGlobalPrefix(Config.version, { exclude: [''] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.useGlobalFilters(new ApiExceptionFilter());

  const swaggerOptions = new DocumentBuilder()
    .setTitle('Lightning.space API')
    .setDescription(
      `Lightning.space API ${Config.environment.toUpperCase()} (updated on ${new Date().toLocaleString()})`,
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
