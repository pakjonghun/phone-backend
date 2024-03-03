import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Client } from './client.scheme';
import { Product } from './product.scheme';

export interface ISale {
  outDate: string;
  inDate: string;
  isConfirmed: boolean;
  rank: number;
  distanceLog: string | null;
  inClient: Client;
  outClient: Client;
  product: Product;
  inPrice: number;
  outPrice: number;
}

export type SaleDocument = HydratedDocument<Sale>;

@Schema({ timestamps: true })
export class Sale implements ISale {
  @Prop({ type: String, required: true })
  outDate: string;

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
    ref: Client.name,
    required: true,
  })
  outClient: Client;

  @Prop({
    type: String,
    ref: Product.name,
    required: true,
  })
  product: Product;

  @Prop({ type: Number, required: true })
  inPrice: number;

  @Prop({ type: Number, required: true })
  outPrice: number;
}

export const SaleScheme = SchemaFactory.createForClass(Sale);
