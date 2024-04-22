import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty({
    description: 'Access token of lightning.space API',
  })
  accessToken: string;

  @ApiProperty({
    description: 'Lightning address',
  })
  lightningAddress: string;
}
