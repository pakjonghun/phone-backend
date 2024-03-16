import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export interface ISale {
  inDate: string;
  inClient: string;
  outDate: string;
  outClient: string;
  product: string;
  _id: string;
  imei: string;
  inPrice: number;
  outPrice: number;
  margin: number;
  marginRate: number;
  note: string;
  rank: string;
  uploadId: string;
}

export type SaleDocument = HydratedDocument<Sale>;

@Schema({ timestamps: true, versionKey: false })
export class Sale implements ISale {
  @Prop({ type: String })
  inDate: string;

  @Prop({ type: String })
  inClient: string;

  @Prop({ type: String })
  outDate: string;

  @Prop({ type: String })
  outClient;

  @Prop({ type: String })
  product: string;

  @Prop({ type: String })
  _id: string;

  @Prop({ type: String })
  imei: string;

  @Prop({ type: Number })
  inPrice: number;

  @Prop({ type: Number })
  outPrice: number;

  @Prop({ type: Number })
  margin: number;

  @Prop({ type: Number })
  marginRate: number;

  @Prop({ type: String })
  note: string;

  @Prop({ type: String })
  rank: string;

  @Prop({ type: String })
  uploadId: string;
}

export const SaleScheme = SchemaFactory.createForClass(Sale);
