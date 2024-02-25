import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import * as dayjs from 'dayjs';

@ValidatorConstraint({ async: true })
export class isDayjsDate implements ValidatorConstraintInterface {
  validate(value: any): boolean | Promise<boolean> {
    const isValid = dayjs(value).isValid();
    return isValid;
  }
}
