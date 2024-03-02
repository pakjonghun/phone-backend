import { IsArray, IsString } from 'class-validator';

export class ConfirmSaleListDTO {
  @IsArray()
  @IsString({ each: true })
  idList: string[];
}
