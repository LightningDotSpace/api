import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty({
    description: 'Access token of Lightning.space API',
  })
  accessToken: string;
}
