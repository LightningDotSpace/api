import { Controller, UseGuards } from '@nestjs/common';
import { Body, Post } from '@nestjs/common/decorators';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiExcludeEndpoint } from '@nestjs/swagger';
import { GetJwt } from 'src/shared/auth/get-jwt.decorator';
import { JwtPayload } from 'src/shared/auth/jwt-payload.interface';
import { RoleGuard } from 'src/shared/auth/role.guard';
import { WalletRole } from 'src/shared/auth/wallet-role.enum';
import { BoltzQueryDto } from '../dto/boltz-query.dto';
import { DbQueryDto } from '../dto/db-query.dto';
import { DebugQueryDto } from '../dto/debug-query.dto';
import { LogQueryDto, LogQueryResult } from '../dto/log-query.dto';
import { SupportService } from '../services/support.service';

@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('db')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.ADMIN))
  async getRawData(
    @Body()
    query: DbQueryDto,
  ): Promise<{ keys: string[]; values: any }> {
    return this.supportService.getRawData(query);
  }

  @Post('debug')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.DEBUG))
  async executeDebugQuery(
    @GetJwt() jwt: JwtPayload,
    @Body() dto: DebugQueryDto,
  ): Promise<Record<string, unknown>[]> {
    return this.supportService.executeDebugQuery(dto.sql, jwt.address);
  }

  @Post('debug/logs')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.DEBUG))
  async executeLogQuery(@GetJwt() jwt: JwtPayload, @Body() dto: LogQueryDto): Promise<LogQueryResult> {
    return this.supportService.executeLogQuery(dto, jwt.address);
  }

  @Post('debug/boltz')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.DEBUG))
  async executeBoltzQuery(
    @GetJwt() jwt: JwtPayload,
    @Body() dto: BoltzQueryDto,
  ): Promise<Record<string, unknown>[]> {
    return this.supportService.executeBoltzQuery(dto.sql, jwt.address);
  }
}
