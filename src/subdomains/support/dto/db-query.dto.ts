import { Type } from 'class-transformer';
import { IsDate, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class DbQueryDto {
  @IsNotEmpty()
  @IsString()
  table: string;

  @IsOptional()
  @IsNumber()
  min = 1;

  @IsOptional()
  @IsNumber()
  maxLine: number;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  updatedSince: Date = new Date(0);

  @IsOptional()
  @IsString()
  sorting: 'ASC' | 'DESC' = 'ASC';

  @IsOptional()
  select?: string[];

  @IsOptional()
  join: [string, string][] = [];

  @IsOptional()
  where: [string, { [key: string]: string }][] = [];

  // Comma separated column names
  @IsOptional()
  @IsString()
  filterCols?: string;
}
