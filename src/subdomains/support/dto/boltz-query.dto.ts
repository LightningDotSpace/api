import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class BoltzQueryDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(10000)
  sql: string;
}
