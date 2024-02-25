import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { Observable } from 'rxjs';

@Injectable()
export class LogoutInterceptor implements NestInterceptor {
  constructor(private config: ConfigService) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> | Promise<Observable<any>> {
    const domain = this.config.get('COOKIE_DOMAIN');
    const response = context.switchToHttp().getResponse() as Response;
    response.cookie('userInfo', '', { expires: new Date(0) });
    response.clearCookie('userInfo', { domain, httpOnly: true, path: '/' });

    return next.handle();
  }
}
