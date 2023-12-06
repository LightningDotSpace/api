import { Body, Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { LnBitsUserInvoiceDto } from 'src/integration/blockchain/lightning/dto/lnbits.dto';
import { LightningLndhubAuthDto } from '../dto/lightning-lndhub-auth.dto';
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
  @ApiBearerAuth()
  async balance(@Req() req: Request, @Body() body: any, @Query() params: any): Promise<any> {
    return this.forwardService.lndhubRequest(req, body, params);
  }

  @Get('gettxs')
  @ApiBearerAuth()
  async gettxs(@Req() req: Request, @Body() body: any, @Query() params: any): Promise<any> {
    return this.forwardService.lndhubRequest(req, body, params);
  }

  @Get('getuserinvoices')
  @ApiBearerAuth()
  async getuserinvoices(@Req() req: Request, @Body() body: any, @Query() params: any): Promise<any> {
    return this.forwardService
      .lndhubRequest<LnBitsUserInvoiceDto[]>(req, body, params)
      .then((r) => r?.filter((i) => i.ispaid));
  }

  @Get('getbtc')
  @ApiBearerAuth()
  async getbtc(@Req() req: Request, @Body() body: any, @Query() params: any): Promise<any> {
    return this.forwardService.lndhubRequest(req, body, params);
  }

  @Get('getpending')
  @ApiBearerAuth()
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
  async auth(@Req() req: Request, @Body() body: LightningLndhubAuthDto, @Query() params: any): Promise<any> {
    return this.forwardService.lndhubRequest(req, body, params);
  }

  @Post('addinvoice')
  @ApiBearerAuth()
  async addinvoice(@Req() req: Request, @Body() body: any, @Query() params: any): Promise<any> {
    return this.forwardService.lndhubRequest(req, body, params);
  }

  @Post('payinvoice')
  @ApiBearerAuth()
  async payinvoice(@Req() req: Request, @Body() body: any, @Query() params: any): Promise<any> {
    return this.forwardService.lndhubRequest(req, body, params);
  }
}
