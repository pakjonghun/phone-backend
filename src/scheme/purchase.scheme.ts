import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export interface IPurchase {
  inDate: string;
  inClient: string;
  product: string;
  imei: string;
  inPrice: number;
  note: string;
  uploadId: string;
}

export type PurchaseDocument = HydratedDocument<Purchase>;

@Schema({ timestamps: true, versionKey: false })
export class Purchase implements IPurchase {
  @Prop({ type: String })
  inDate: string;

  @Prop({ type: String })
  inClient: string;

  @Prop({ type: String })
  product: string;

  @Prop({ type: String })
  imei: string;

  @Prop({ type: Number })
  inPrice: number;

  @Prop({ type: String })
  note: string;

  @Prop({ type: String })
  uploadId: string;
}

export const PurchaseScheme = SchemaFactory.createForClass(Purchase);
