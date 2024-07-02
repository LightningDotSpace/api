import { ApiProperty } from '@nestjs/swagger';
import { IsArray } from 'class-validator';

export class LightningUserBoltcardQueryDto {
  @ApiProperty()
  @IsArray()
  addresses: string[];
}
