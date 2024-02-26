import {
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
} from 'class-validator';
import { Order } from '../type';

const order: Record<Order, number> = {
  [1]: 1,
  [-1]: -1,
};

@ValidatorConstraint({ async: true })
export class IsKeyOfOrder implements ValidatorConstraintInterface {
  validate(value: any): boolean | Promise<boolean> {
    return value in order;
  }
}

@ValidatorConstraint({ async: false })
class IsOrderValidConstraint implements ValidatorConstraintInterface {
  validate(propertyValue: any[]) {
    return propertyValue.every((item) => {
      return item[1] === '1' || item[1] === '-1';
    });
  }

  defaultMessage() {
    return '정렬은 1 이나 -1 이 되야 합니다.';
  }
}

export function IsOrderValid(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsOrderValidConstraint,
    });
  };
}
