import { OmitType } from '@nestjs/mapped-types';
import { SignupDTO } from './signup.dto.ts.js';

export class RoleChangeDTO extends OmitType(SignupDTO, ['password', 'id']) {}
