import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';
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
    description: 'Used wallet for login',
  })
  @IsNotEmpty()
  @IsString()
  walletName: string;
}
