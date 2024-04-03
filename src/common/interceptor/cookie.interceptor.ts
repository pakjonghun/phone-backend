import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { map } from 'rxjs';

@Injectable()
export class SaveCookieInterceptor implements NestInterceptor {
  constructor(private config: ConfigService) {}

  intercept(context: ExecutionContext, next: CallHandler<any>) {
    const response = context.switchToHttp().getResponse() as Response;
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    return next.handle().pipe(
      map((userInfo) => {
        console.log('cookie', this.config.get('COOKIE_DOMAIN'));
        response.cookie('userInfo', userInfo.token, {
          domain: this.config.get('COOKIE_DOMAIN'),
          maxAge: oneWeek,
          httpOnly: true,
          secure: true,
          sameSite: 'none',
          path: '/',
        });
        return { message: 'success', userInfo: userInfo.payload };
      }),
    );
  }
}
