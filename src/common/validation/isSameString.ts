import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

export function IsSameString(property: string, options?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'isSameString',
      target: object.constructor,
      propertyName,
      options,
      constraints: [property],
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          return value === relatedPropertyName;
        },
      },
    });
  };
}
