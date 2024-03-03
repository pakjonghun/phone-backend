import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Client } from './client.scheme';
import { Product } from './product.scheme';

export interface IPurchase {
  inDate: string;
  isConfirmed: boolean;
  rank: number;
  distanceLog: string | null;
  inClient: Client;
  product: Product;
  inPrice: number;
}

export type SaleDocument = HydratedDocument<IPurchase>;

@Schema({ timestamps: true })
export class Purchase implements IPurchase {
  @Prop({ type: String, required: true })
  inDate: string;

  @Prop({ type: Boolean, required: true })
  isConfirmed: boolean;

  @Prop({ type: Number, required: true })
  rank: number;

  @Prop({ type: String, required: false, default: null })
  distanceLog: string | null;

  @Prop({
    type: String,
    ref: Client.name,
    required: true,
  })
  inClient: Client;

  @Prop({
    type: String,
    ref: Product.name,
    required: true,
  })
  product: Product;

  @Prop({ type: Number, required: true })
  inPrice: number;
}

export const PurchaseScheme = SchemaFactory.createForClass(Purchase);
