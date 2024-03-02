import { IsArray, IsString } from 'class-validator';

export class CommonMultiUpdateDTO {
  @IsArray()
  @IsString({ each: true })
  idList: string[];
}
