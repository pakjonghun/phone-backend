import { IsArray, IsString } from 'class-validator';

export class CommonDownloadDTO {
  @IsArray()
  @IsString({ each: true })
  idList: string[];
}
