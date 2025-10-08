import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreateRskSwapDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(10000)
  invoiceAmount: number;

  @IsNotEmpty()
  @IsString()
  claimAddress: string;
}
