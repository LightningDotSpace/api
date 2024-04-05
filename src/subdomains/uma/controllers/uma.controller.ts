import { Body, Controller, Param, Post, Query } from '@nestjs/common';
import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { PayReqResponse, PayRequest } from '@uma-sdk/core';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { UmaService } from 'src/integration/blockchain/uma/services/uma.service';
import { UmaClient } from 'src/integration/blockchain/uma/uma-client';
import { LightningLogger } from 'src/shared/services/lightning-logger';

// Workflow API only for testing purposes, will be removed
export class WorkflowDto {
  @ApiProperty({ default: '$0c0ca2@localhost:3001' })
  @IsString()
  @IsNotEmpty()
  senderAddress: string;

  @ApiProperty({ default: '$1f98dd@localhost:3002' })
  @IsString()
  @IsNotEmpty()
  receiverAddress: string;

  @ApiProperty({ default: 'usd' })
  @IsString()
  @IsNotEmpty()
  currencyCode: string;

  @ApiProperty({ default: '0.01' })
  @IsNumber()
  @IsNotEmpty()
  amount: number;
}

@ApiTags('UMA')
@Controller('uma')
export class UmaController {
  // TODO: Logger only for testing purposes, will be removed
  private readonly logger = new LightningLogger(UmaController);

  private readonly client: UmaClient;

  constructor(private readonly umaService: UmaService) {
    this.client = umaService.getDefaultClient();
  }

  // TODO: Workflow API only for testing purposes, will be removed
  @Post('workflow')
  async testWorkflow(@Body() dto: WorkflowDto): Promise<PayReqResponse> {
    const requestUrl = await this.umaService.createRequestUrl(dto.receiverAddress);
    this.logger.info('Request URL:');
    this.logger.info(requestUrl.toString());
    this.logger.info('--------------------------------------------------------------------------------');

    const response = await this.umaService.sendRequest(requestUrl);
    this.logger.info('Response:');
    this.logger.info(JSON.stringify(response));
    this.logger.info('--------------------------------------------------------------------------------');

    const payRequestResponse = await this.umaService.sendPayRequest(
      dto.currencyCode,
      dto.amount,
      dto.senderAddress,
      dto.receiverAddress,
      response,
    );
    this.logger.info('Pay Request Response:');
    this.logger.info(JSON.stringify(payRequestResponse));
    this.logger.info('--------------------------------------------------------------------------------');

    await this.umaService.finishPayment(payRequestResponse);

    return payRequestResponse;
  }

  @Post(':callbackAddress')
  async callback(
    @Param('callbackAddress') callbackAddress: string,
    @Query('senderVaspDomain') senderVaspDomain: string,
    @Body() payRequest: PayRequest,
  ): Promise<PayReqResponse> {
    this.logger.info('Pay Request:');
    this.logger.info(JSON.stringify(payRequest));
    this.logger.info('--------------------------------------------------------------------------------');

    return this.umaService.createPayRequestResponse(callbackAddress, senderVaspDomain, payRequest);
  }
}
