import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { Client } from './client.scheme';
import { Product } from './product.scheme';

export interface IPurchase {
  date: string;
  price: number;
  client: Client;
  product: Product;
}

export type PurchaseDocument = HydratedDocument<Purchase>;

@Schema()
export class Purchase implements IPurchase {
  @Prop()
  date: string;

  @Prop()
  price: number;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Client.name })
  client: Client;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Client.name })
  product: Product;
}

export const PurchaseScheme = SchemaFactory.createForClass(Purchase);
