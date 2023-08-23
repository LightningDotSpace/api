import { Body, Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { LightningForwardService } from '../services/lightning-forward.service';

@ApiTags('LNDHUB')
@Controller('lndhub/ext')
export class LightingForwardController {
  constructor(private forwardService: LightningForwardService) {}

  @Get('getinfo')
  async getinfo(@Req() req: Request, @Query() params: any): Promise<any> {
    return this.forwardService.lndhubGet(req, params);
  }

  @Get('balance')
  async balance(@Req() req: Request, @Query() params: any): Promise<any> {
    return this.forwardService.lndhubGet(req, params);
  }

  @Get('gettxs')
  async gettxs(@Req() req: Request, @Query() params: any): Promise<any> {
    return this.forwardService.lndhubGet(req, params);
  }

  @Get('getuserinvoices')
  async getuserinvoices(@Req() req: Request, @Query() params: any): Promise<any> {
    return this.forwardService.lndhubGet(req, params);
  }

  @Get('getbtc')
  async getbtc(@Req() req: Request, @Query() params: any): Promise<any> {
    return this.forwardService.lndhubGet(req, params);
  }

  @Get('getpending')
  async getpending(@Req() req: Request, @Query() params: any): Promise<any> {
    return this.forwardService.lndhubGet(req, params);
  }

  @Get('decodeinvoice')
  async decodeinvoice(@Req() req: Request, @Query() params: any): Promise<any> {
    return this.forwardService.lndhubGet(req, params);
  }

  @Get('checkrouteinvoice')
  async checkrouteinvoice(@Req() req: Request, @Res() res: Response, @Query() params: any): Promise<any> {
    const result = await this.forwardService.lndhubGet(req, params);

    if (null === result) {
      return res.json(null);
    }

    return result;
  }

  @Post('auth')
  async auth(@Req() req: Request, @Body() body: any, @Query() params: any): Promise<any> {
    return this.forwardService.lndhubPost(req, body, params);
  }

  @Post('addinvoice')
  async addinvoice(@Req() req: Request, @Body() body: any, @Query() params: any): Promise<any> {
    return this.forwardService.lndhubPost(req, body, params);
  }

  @Post('payinvoice')
  async payinvoice(@Req() req: Request, @Body() body: any, @Query() params: any): Promise<any> {
    return this.forwardService.lndhubPost(req, body, params);
  }
}
