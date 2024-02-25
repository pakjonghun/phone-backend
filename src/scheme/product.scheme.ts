import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export interface IProduct {
  name: string;
  price: number;
}

export type ProductDocument = HydratedDocument<Product>;

@Schema()
export class Product implements IProduct {
  @Prop()
  name: string;

  @Prop()
  price: number;
}

export const ProductSCheme = SchemaFactory.createForClass(Product);
