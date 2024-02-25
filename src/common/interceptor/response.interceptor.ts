import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { map } from 'rxjs';
import { getNowDate } from '../utils';
import { Response } from 'express';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  async intercept(context: ExecutionContext, next: CallHandler<any>) {
    const res = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map(async (data) => {
        if (Buffer.isBuffer(data)) {
          res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          );
          res.setHeader(
            'Content-Disposition',
            `attachment; filename=${getNowDate()}.xlsx`,
          );

          return new StreamableFile(data);
        }

        return data == null //
          ? { message: 'success' }
          : data;
      }),
    );
  }
}
