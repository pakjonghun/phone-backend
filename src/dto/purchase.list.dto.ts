import { Transform } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Order } from 'src/common/type';
import {
  IsOrderValid,
  IsPurchaseKeyValid,
} from 'src/common/validation/order.validation';

export class PurchaseListDTO {
  @IsOptional()
  @IsArray()
  @IsArray({ each: true })
  @IsOrderValid()
  @IsPurchaseKeyValid()
  sort: [string, Order][];

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
