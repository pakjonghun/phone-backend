import { Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UploadRecordDocument = HydratedDocument<UploadPurchaseRecord>;

@Schema({ timestamps: true, versionKey: false })
export class UploadPurchaseRecord {}

export const UploadPurchaseRecordScheme =
  SchemaFactory.createForClass(UploadPurchaseRecord);
