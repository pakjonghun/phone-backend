import {
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
} from 'class-validator';
import { IPurchase } from 'src/scheme/purchase.scheme';

const purchaseSortKey: Record<
  keyof Omit<IPurchase, '_id' | 'uploadId'>,
  number
> = {
  no: 1,
  inDate: 1,
  inClient: 1,
  product: 1,
  imei: 1,
  inPrice: 1,
  note: 1,
};

@ValidatorConstraint({ async: false })
export class IsSortKeyValid implements ValidatorConstraintInterface {
  validate(propertyValue: [string, string][]) {
    return propertyValue.every(([key]) => {
      return !!purchaseSortKey[key];
    });
  }

  defaultMessage() {
    return '잘못된 정렬 키 입니다.';
  }
}

export function isPurchaseKeyValid(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsSortKeyValid,
    });
  };
}
