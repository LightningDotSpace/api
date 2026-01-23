import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ScheduleModule } from '@nestjs/schedule';
import { GetConfig } from 'src/config/config';
import { ConfigModule } from 'src/config/config.module';
import { JwtStrategy } from './auth/jwt.strategy';
import { RepositoryFactory } from './db/repository.factory';
import { AppInsightsQueryService } from './services/app-insights-query.service';
import { HttpService } from './services/http.service';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt', session: true }),
    JwtModule.register(GetConfig().auth.jwt),
    ScheduleModule.forRoot(),
  ],
  controllers: [],
  providers: [HttpService, JwtStrategy, RepositoryFactory, AppInsightsQueryService],
  exports: [PassportModule, JwtModule, ScheduleModule, HttpService, RepositoryFactory, AppInsightsQueryService],
})
export class SharedModule {}
