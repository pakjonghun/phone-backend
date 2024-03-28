import { IsOptional, IsString } from 'class-validator';

export class EditClientDTO {
  @IsString()
  id: string;

  @IsOptional()
  @IsString()
  manager?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
