import { IsString, MinLength } from 'class-validator';
import { IsKeyofRole } from '../validation/role.validation';
import { CustomValid } from 'src/common/validation/isKeyof.validation';
import { Role } from 'src/scheme/user.scheme';

export class SignupDTO {
  @IsString()
  @MinLength(2)
  id: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @CustomValid(IsKeyofRole)
  role: Role;
}
