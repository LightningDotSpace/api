import { Body, Controller, Delete, Get, Post, Put, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { BoltCardAuthDto, BoltcardScanDto } from 'src/integration/blockchain/lightning/dto/boltcards.dto';
import { LightningForwardService } from '../services/lightning-forward.service';

@ApiTags('Boltcards')
@Controller('boltcards')
export class LightingBoltcardsForwardController {
  constructor(private forwardService: LightningForwardService) {}

  @Get('scan/:external_id')
  async scan(@Req() req: Request, @Body() body: any, @Query() params: any): Promise<BoltcardScanDto> {
    return this.forwardService.boltcardsScanForward(req, body, params);
  }

  @Get('lnurl/cb/:hit_id')
  async lnurlCb(@Req() req: Request, @Body() body: any, @Query() params: any): Promise<any> {
    return this.forwardService.boltcardsRequest(req, body, params);
  }

  @Get('auth')
  async auth(@Req() req: Request, @Body() body: any, @Query() params: any): Promise<BoltCardAuthDto> {
    return this.forwardService.boltcardsAuthForward(req, body, params);
  }

  @Get('lnurlp/:hit_id')
  async lnurlp(@Req() req: Request, @Body() body: any, @Query() params: any): Promise<any> {
    return this.forwardService.boltcardsRequest(req, body, params);
  }

  @Get('lnurlp/cb/:hit_id')
  async lnurlpCb(@Req() req: Request, @Body() body: any, @Query() params: any): Promise<any> {
    return this.forwardService.boltcardsRequest(req, body, params);
  }

  @Get('cards')
  async cardsGet(@Req() req: Request, @Body() body: any, @Query() params: any): Promise<any> {
    return this.forwardService.boltcardsRequest(req, body, params);
  }

  @Post('cards')
  async cardsPost(@Req() req: Request, @Body() body: any, @Query() params: any): Promise<any> {
    return this.forwardService.boltcardsRequest(req, body, params);
  }

  @Put('cards/:card_id')
  async cardsPut(@Req() req: Request, @Body() body: any, @Query() params: any): Promise<any> {
    return this.forwardService.boltcardsRequest(req, body, params);
  }

  @Delete('cards/:card_id')
  async cardsDelete(@Req() req: Request, @Body() body: any, @Query() params: any): Promise<any> {
    return this.forwardService.boltcardsRequest(req, body, params);
  }

  @Get('cards/enable/:card_id/:enable')
  async cardsEnable(@Req() req: Request, @Body() body: any, @Query() params: any): Promise<any> {
    return this.forwardService.boltcardsRequest(req, body, params);
  }

  @Get('hits')
  async hits(@Req() req: Request, @Body() body: any, @Query() params: any): Promise<any> {
    return this.forwardService.boltcardsRequest(req, body, params);
  }

  @Get('refunds')
  async refunds(@Req() req: Request, @Body() body: any, @Query() params: any): Promise<any> {
    return this.forwardService.boltcardsRequest(req, body, params);
  }
}
