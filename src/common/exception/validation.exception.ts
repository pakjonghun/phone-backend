import { BadRequestException } from '@nestjs/common';

export class ValidationException extends BadRequestException {
  constructor(public validationError: string[]) {
    super();
  }
}
