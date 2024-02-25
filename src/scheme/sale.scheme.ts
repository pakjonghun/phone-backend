import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { Client } from './client.scheme';
import { Product } from './product.scheme';

export interface ISale {
  date: string;
  price: number;
  client: Client;
  product: Product;
}

export type SaleDocument = HydratedDocument<Sale>;

@Schema()
export class Sale implements ISale {
  @Prop()
  date: string;

  @Prop()
  price: number;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Client.name })
  client: Client;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Client.name })
  product: Product;
}

export const SaleScheme = SchemaFactory.createForClass(Sale);
