import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export interface IClient {
  lastInDate: string;
  lastOutDate: string;
}

export type SaleDocument = HydratedDocument<Client>;

@Schema({ timestamps: true })
export class Client implements IClient {
  @Prop()
  _id: string;

  @Prop()
  lastInDate: string;

  @Prop()
  lastOutDate: string;
}

export const ClientScheme = SchemaFactory.createForClass(Client);
