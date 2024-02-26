import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export interface IClient {
  inPrice: number;
  inCount: number;
  outPrice: number;
  outCount: number;
}

export type SaleDocument = HydratedDocument<Client>;

@Schema()
export class Client implements IClient {
  @Prop()
  _id: string;

  @Prop({ default: 0, type: Number })
  inPrice: number;

  @Prop({ default: 0, type: Number })
  inCount: number;

  @Prop({ default: 0, type: Number })
  outPrice: number;

  @Prop({ default: 0, type: Number })
  outCount: number;
}

export const ClientScheme = SchemaFactory.createForClass(Client);
