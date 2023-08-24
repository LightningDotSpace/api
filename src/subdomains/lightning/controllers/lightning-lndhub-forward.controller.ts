import { Body, Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { LightningForwardService } from '../services/lightning-forward.service';

@ApiTags('LNDHub')
@Controller('lndhub')
export class LightingLndhubForwardController {
  constructor(private forwardService: LightningForwardService) {}

  @Get('getinfo')
  async getinfo(@Req() req: Request, @Body() body: any, @Query() params: any): Promise<any> {
    return this.forwardService.lndhubRequest(req, body, params);
  }

  @Get('balance')
  async balance(@Req() req: Request, @Body() body: any, @Query() params: any): Promise<any> {
    return this.forwardService.lndhubRequest(req, body, params);
  }

  @Get('gettxs')
  async gettxs(@Req() req: Request, @Body() body: any, @Query() params: any): Promise<any> {
    return this.forwardService.lndhubRequest(req, body, params);
  }

  @Get('getuserinvoices')
  async getuserinvoices(@Req() req: Request, @Body() body: any, @Query() params: any): Promise<any> {
    return this.forwardService.lndhubRequest(req, body, params);
  }

  @Get('getbtc')
  async getbtc(@Req() req: Request, @Body() body: any, @Query() params: any): Promise<any> {
    return this.forwardService.lndhubRequest(req, body, params);
  }

  @Get('getpending')
  async getpending(@Req() req: Request, @Body() body: any, @Query() params: any): Promise<any> {
    return this.forwardService.lndhubRequest(req, body, params);
  }

  @Get('decodeinvoice')
  async decodeinvoice(@Req() req: Request, @Body() body: any, @Query() params: any): Promise<any> {
    return this.forwardService.lndhubRequest(req, body, params);
  }

  @Get('checkrouteinvoice')
  async checkrouteinvoice(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: any,
    @Query() params: any,
  ): Promise<any> {
    const result = await this.forwardService.lndhubRequest(req, body, params);

    if (null === result) {
      return res.json(null);
    }

    return result;
  }

  @Post('auth')
  async auth(@Req() req: Request, @Body() body: any, @Query() params: any): Promise<any> {
    return this.forwardService.lndhubRequest(req, body, params);
  }

  @Post('addinvoice')
  async addinvoice(@Req() req: Request, @Body() body: any, @Query() params: any): Promise<any> {
    return this.forwardService.lndhubRequest(req, body, params);
  }

  @Post('payinvoice')
  async payinvoice(@Req() req: Request, @Body() body: any, @Query() params: any): Promise<any> {
    return this.forwardService.lndhubRequest(req, body, params);
  }
}
