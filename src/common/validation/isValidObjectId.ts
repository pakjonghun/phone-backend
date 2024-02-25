import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import mongoose from 'mongoose';

@ValidatorConstraint({ async: true })
export class isValidObjectId implements ValidatorConstraintInterface {
  validate(value: any): boolean | Promise<boolean> {
    return mongoose.Types.ObjectId.isValid(value);
  }
}
