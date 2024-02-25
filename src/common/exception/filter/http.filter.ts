import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { deleteUploadFile } from 'src/common/utils';

@Catch(HttpException)
export class HttpFilter implements ExceptionFilter {
  async catch(exception: HttpException, host: ArgumentsHost) {
    await deleteUploadFile();
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const message = exception.message;
    new Logger('error').error(exception.message);
    return res.status(status).json({
      message,
    });
  }
}
