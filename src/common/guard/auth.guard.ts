import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { isArray } from 'class-validator';
import { Request } from 'express';
import { Observable } from 'rxjs';

export enum AUTH_TYPE {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  STAFF = 'STAFF',
  ANY = 'ANY',
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflctor: Reflector) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const authType = this.reflctor.get<AUTH_TYPE>(
      'authType',
      context.getHandler(),
    );

    const request = context.switchToHttp().getRequest() as Request;
    const userInfo = request['userInfo'];
    const role = userInfo?.role;

    if (authType == null) return true;

    if (AUTH_TYPE.ANY === authType) {
      console.log('any userInfo', userInfo);
      return Boolean(userInfo);
    }

    if (isArray(authType)) {
      return authType.includes(role);
    }

    switch (authType) {
      case AUTH_TYPE.ADMIN:
      case AUTH_TYPE.MANAGER:
      case AUTH_TYPE.STAFF:
        return role === authType;
      default:
        throw new HttpException('UnAuthType', HttpStatus.FORBIDDEN);
    }
  }
}
