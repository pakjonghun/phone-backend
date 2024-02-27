import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export interface IProduct {
  recentHighSalePrice: number;
  recentLowPrice: number;
  belowAverageCount: number;
}

export type ProductDocument = HydratedDocument<Product>;

@Schema({ versionKey: false })
export class Product implements IProduct {
  @Prop()
  _id: string;

  @Prop({ default: 0, type: Number })
  recentHighSalePrice: number;

  @Prop({ default: 0, type: Number })
  recentLowPrice: number;

  @Prop({ default: 0, type: Number })
  belowAverageCount: number;
}

export const ProductSCheme = SchemaFactory.createForClass(Product);
