import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor() {}

  private logger = new Logger('api');

  intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> | Promise<Observable<any>> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const origin = req.headers.origin;
    const refere = req.headers.referer;

    this.logger.log(`${req.method} - ${req.url}-${origin}-${refere}`);

    return next.handle();
  }
}
