import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import * as dayjs from 'dayjs';

export function isAfter(property: string, options?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'isAfter',
      target: object.constructor,
      propertyName,
      options,
      constraints: [property],
      validator: {
        validate(value: string, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          const refValue = args.object[relatedPropertyName];
          const refValueDate = dayjs(refValue);

          if (!refValueDate.isValid()) return false;

          const valueDate = dayjs(value);
          return refValueDate.isBefore(valueDate);
        },
      },
    });
  };
}
