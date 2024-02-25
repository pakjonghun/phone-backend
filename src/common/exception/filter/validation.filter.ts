import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import { ValidationException } from '../validation.exception';
import { Response } from 'express';
import { deleteUploadFile } from 'src/common/utils';

@Catch(ValidationException)
export class ValidateFilter implements ExceptionFilter {
  async catch(exception: ValidationException, host: ArgumentsHost) {
    await deleteUploadFile();
    const message = exception.validationError[0];
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    new Logger('error').error(exception.message);
    return res.status(400).json({
      message,
    });
  }
}
