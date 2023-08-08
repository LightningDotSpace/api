import { ApiProperty } from '@nestjs/swagger';

export class SignMessageDto {
  @ApiProperty({
    description: 'Message to sign',
  })
  message: string;
}
