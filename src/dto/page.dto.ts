import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class Page {
  @Transform(({ value }) => (value != null ? Number(value) : 1))
  @Min(1)
  @IsOptional()
  @IsNumber()
  page?: number;

  @Transform(({ value }) => (value != null ? Number(value) : 10))
  @Min(1)
  @IsOptional()
  @IsNumber()
  length?: number;
}
