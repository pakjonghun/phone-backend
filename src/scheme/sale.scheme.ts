import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Client } from './client.scheme';
import { Product } from './product.scheme';

export interface ISale {
  outDate: string;
  inDate: string;
  isConfirmed: boolean;
  rank: string;
  distanceLog: string | null;
  inClient: Client;
  outClient: Client;
  product: Product;
  inPrice: number;
  outPrice: number;
}

export type SaleDocument = HydratedDocument<Sale>;

@Schema()
export class Sale implements ISale {
  @Prop({ type: String, isRequired: true })
  outDate: string;

  @Prop({ type: String, isRequired: true })
  inDate: string;

  @Prop({ type: Boolean, isRequired: true })
  isConfirmed: boolean;

  @Prop({ type: String, isRequired: true })
  rank: string;

  @Prop({ type: String, isRequired: false, default: null })
  distanceLog: string | null;

  @Prop({
    type: String,
    ref: Client.name,
    isRequired: true,
  })
  inClient: Client;

  @Prop({
    type: String,
    ref: Client.name,
    isRequired: true,
  })
  outClient: Client;

  @Prop({
    type: String,
    ref: Product.name,
    isRequired: true,
  })
  product: Product;

  @Prop({ type: Number, required: true })
  inPrice: number;

  @Prop({ type: Number, required: true })
  outPrice: number;
}

export const SaleScheme = SchemaFactory.createForClass(Sale);
