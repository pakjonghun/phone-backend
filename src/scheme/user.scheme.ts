import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { AUTH_TYPE } from 'src/common/guard/auth.guard';

export type Role = Exclude<keyof typeof AUTH_TYPE, 'ANY'>;

export interface IUser {
  _id: string;
  password: string;
  role: Role;
}

export type UserDocument = HydratedDocument<User>;

@Schema()
export class User implements IUser {
  @Prop()
  _id: string;

  @Prop()
  password: string;

  @Prop()
  role: Role;
}

export const UserScheme = SchemaFactory.createForClass(User);
