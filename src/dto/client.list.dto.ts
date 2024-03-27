import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class ClientListDTO {
  @IsOptional()
  @Transform((params) => {
    const value = params.value?.trim();
    return value //
      ? value
      : '';
  })
  @IsString()
  keyword: string;

  @Transform((params) => {
    const value = Number(params.value);
    return isNaN(value) ? params.value : value;
  })
  @IsNumber()
  @Min(1)
  page: number;

  @Transform((params) => {
    const value = Number(params.value);
    return isNaN(value) ? params.value : value;
  })
  @IsNumber()
  @Min(1)
  length: number;
}
