import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
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
