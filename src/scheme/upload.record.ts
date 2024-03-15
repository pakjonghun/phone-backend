import { Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UploadRecordDocument = HydratedDocument<UploadRecord>;

@Schema({ timestamps: true, versionKey: false })
export class UploadRecord {}

export const UploadRecordScheme = SchemaFactory.createForClass(UploadRecord);
