import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export interface IClient {
  name: string;
}

export type SaleDocument = HydratedDocument<Client>;

@Schema()
export class Client implements IClient {
  @Prop()
  name: string;
}

export const ClientScheme = SchemaFactory.createForClass(Client);
