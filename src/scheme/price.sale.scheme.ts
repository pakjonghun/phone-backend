import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export interface IPriceSale {
  outDate: string;
  outClient: string;
  product: string;
  _id: string;
  inPrice: number;
  outPrice: number;
  uploadId: string;
}

export type PriceSaleDocument = HydratedDocument<IPriceSale>;

@Schema({ timestamps: true, versionKey: false })
export class PriceSale implements IPriceSale {
  @Prop({ type: String })
  outDate: string;

  @Prop({ type: String })
  outClient;

  @Prop({ type: String })
  product: string;

  @Prop({ type: String })
  _id: string;

  @Prop({ type: Number })
  inPrice: number;

  @Prop({ type: Number })
  outPrice: number;

  @Prop({ type: String })
  uploadId: string;
}

export const PriceSaleScheme = SchemaFactory.createForClass(PriceSale);
