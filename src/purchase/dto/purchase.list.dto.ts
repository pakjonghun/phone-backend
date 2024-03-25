import { Transform } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Order } from 'src/common/type';
import { IsOrderValid } from 'src/common/validation/order.validation';
import { isPurchaseKeyValid } from '../validation/isKeyof.validation';

export class PurchaseListDTO {
  @IsOptional()
  @IsArray()
  @IsArray({ each: true })
  @IsOrderValid()
  @isPurchaseKeyValid()
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

  @IsOptional()
  @Transform((param) => {
    return new Date(param.value);
  })
  @IsDate()
  startDate: Date;

  @IsOptional()
  @Transform((param) => new Date(param.value))
  @IsDate()
  endDate: Date;
}
