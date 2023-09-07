import { Controller, Get, Res } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { Response } from 'express';
import { readFileSync } from 'fs';

@Controller('')
export class AppController {
  @Get()
  @ApiExcludeEndpoint()
  async home(@Res() res: Response): Promise<any> {
    res.send(readFileSync('src/assets/home.html').toString());
  }
}
