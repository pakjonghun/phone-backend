import { IsArray, IsString } from 'class-validator';

export class DownloadSaleDTO {
  @IsArray()
  @IsString({ each: true })
  idList: string[];
}
