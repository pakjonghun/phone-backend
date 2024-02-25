import {
  ValidatorConstraintInterface,
  registerDecorator,
} from 'class-validator';
import { ValidationOptions } from 'joi';

export function CustomValid(
  validator: { new (): ValidatorConstraintInterface },
  options?: ValidationOptions,
) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options,
      constraints: [],
      validator,
    });
  };
}
