import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { GetConfig } from 'src/config/config';

export class SignUpDto {
  @ApiProperty({
    description: 'Address for login',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(GetConfig().formats.address)
  address: string;

  @ApiProperty({
    description: 'Signature for login',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(GetConfig().formats.signature)
  signature: string;

  @ApiPropertyOptional({
    description: 'Name of the wallet used for login',
  })
  @IsOptional()
  @IsString()
  wallet: string;
}
