import { SetMetadata } from '@nestjs/common';
import { AUTH_TYPE } from '../guard/auth.guard';

export const AuthType = (data: AUTH_TYPE[] | AUTH_TYPE) => {
  return SetMetadata('authType', data);
};
