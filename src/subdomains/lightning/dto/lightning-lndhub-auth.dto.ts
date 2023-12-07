import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LightningLndhubAuthDto {
  @ApiProperty({ description: 'login' })
  @IsNotEmpty()
  @IsString()
  login: string;

  @ApiProperty({ description: 'password' })
  @IsNotEmpty()
  @IsString()
  password: string;
}
