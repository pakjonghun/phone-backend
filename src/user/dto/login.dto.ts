import { IsString, MinLength } from 'class-validator';

export class LoginDTO {
  @IsString()
  @MinLength(2)
  id: string;

  @IsString()
  @MinLength(8)
  password: string;
}
