import { FileValidator } from '@nestjs/common';

export class FileSizeValidator extends FileValidator<Record<string, any>> {
  constructor(protected readonly validationOptions) {
    super(validationOptions);
  }

  isValid(file?: Express.Multer.File): boolean | Promise<boolean> {
    if (file.size > this.validationOptions.size) return false;

    return true;
  }

  buildErrorMessage(file: Express.Multer.File): string {
    return `${file.originalname} file size is more than ${this.validationOptions.size}`;
  }
}

export class FileTypeValidator extends FileValidator<Record<string, any>> {
  constructor(protected readonly validationOptions) {
    super(validationOptions);
  }

  isValid(file?: Express.Multer.File): boolean | Promise<boolean> {
    if (!file) return false;
    if (!this.validationOptions.allowType.includes(file.mimetype)) return false;

    return true;
  }

  buildErrorMessage(file: Express.Multer.File): string {
    return `${file.originalname} is not valid type`;
  }
}
