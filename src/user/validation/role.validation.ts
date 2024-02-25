import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { AUTH_TYPE } from 'src/common/guard/auth.guard';
import { Role } from 'src/scheme/user.scheme';

const role: Record<Role, Role> = {
  [AUTH_TYPE.ADMIN]: AUTH_TYPE.ADMIN,
  [AUTH_TYPE.MANAGER]: AUTH_TYPE.MANAGER,
  [AUTH_TYPE.STAFF]: AUTH_TYPE.STAFF,
};

@ValidatorConstraint({ async: true })
export class IsKeyofRole implements ValidatorConstraintInterface {
  validate(value: any): boolean | Promise<boolean> {
    return value in role;
  }
}
