import { OmitType } from '@nestjs/mapped-types';
import { SignupDTO } from './signup.dto.ts';

export class PasswordChangeDTO extends OmitType(SignupDTO, ['role', 'id']) {}
