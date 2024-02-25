import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import { Response } from 'express';
import { deleteUploadFile } from 'src/common/utils';

@Catch()
export class FallbackFilter implements ExceptionFilter {
  async catch(exception: any, host: ArgumentsHost) {
    await deleteUploadFile();
    let message = exception.message;
    if (exception.code === 11000) {
      const matchError = message.split('dup key:')?.[1];
      if (matchError) {
        const error = matchError.replace(/[\{\}\"]/g, '');
        const splited = error.trim().split(':');
        if (splited.length === 2) {
          message = `${splited[0].trim()}로 입력된 ${splited[1].trim()}는 이미 존재하는 값입니다.`;
        }
      }
    }

    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    new Logger('error').error(exception.stack);
    new Logger('error').error(exception.message);
    res.status(500).json({
      message,
    });
  }
}
