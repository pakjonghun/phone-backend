import {
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
} from 'class-validator';
import { Order } from '../type';
import { ISale } from 'src/scheme/sale.scheme';

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
  validate(propertyValue: [string, string][]) {
    return propertyValue.every(([, order]) => {
      return order === '1' || order === '-1';
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

type SaleSortKey = ISale;

const saleSortKey: Record<keyof Omit<SaleSortKey, '_id'>, number> = {
  inDate: 1,
  inClient: 1,
  outDate: 1,
  outClient: 1,
  product: 1,
  imei: 1,
  inPrice: 1,
  outPrice: 1,
  margin: 1,
  marginRate: 1,
  note: 1,
  rank: 1,
};

@ValidatorConstraint({ async: false })
class IsSortKeyValidConstraint implements ValidatorConstraintInterface {
  validate(propertyValue: [string, string][]) {
    return propertyValue.every(([key]) => {
      return !!saleSortKey[key];
    });
  }

  defaultMessage() {
    return '잘못된 정렬 키 입니다.';
  }
}

export function IsSortKeyValid(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsSortKeyValidConstraint,
    });
  };
}

type PurchaseSortKey = 'product' | 'isConfirmed' | 'rank' | 'distanceLog';

const purchaseSortKey: Record<Partial<PurchaseSortKey>, number> = {
  distanceLog: 1,
  isConfirmed: 1,
  product: 1,
  rank: 1,
};

@ValidatorConstraint({ async: false })
class IsPurchaseKeyValidConstraint implements ValidatorConstraintInterface {
  validate(propertyValue: [string, string][]) {
    return propertyValue.every(([key]) => {
      return !!purchaseSortKey[key];
    });
  }

  defaultMessage() {
    return '잘못된 정렬 키 입니다.';
  }
}

export function IsPurchaseKeyValid(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsPurchaseKeyValidConstraint,
    });
  };
}

const marginSortKey: Record<string, number> = {
  product: 1,
  inPrice: 1,
  outPrice: 1,
  margin: 1,
  marginRate: 1,
  isConfirmed: 1,
  outClient: 1,
};

@ValidatorConstraint({ async: false })
class IsMarginKeyValidConstraint implements ValidatorConstraintInterface {
  validate(propertyValue: [string, string][]) {
    return propertyValue.every(([key]) => {
      return !!marginSortKey[key];
    });
  }

  defaultMessage() {
    return '잘못된 정렬 키 입니다.';
  }
}

export function IsMarginSortKeyValid(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsMarginKeyValidConstraint,
    });
  };
}
