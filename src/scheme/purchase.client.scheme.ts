import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';

export interface IClient {
  backupLastInDate: string[];
  lastInDate: string;
  note: string;
  uploadId: mongoose.Types.ObjectId;
  backupUploadId: mongoose.Types.ObjectId[];

  //추가정보
  manager: string;
}

@Schema({ timestamps: true, versionKey: false })
export class PurchaseClient implements IClient {
  @Prop()
  _id: string;

  @Prop({ type: [String] })
  backupLastInDate: string[];

  @Prop({ type: String })
  lastInDate: string;

  @Prop({ type: String })
  note: string;

  @Prop({ type: [mongoose.Types.ObjectId] })
  backupUploadId: mongoose.Types.ObjectId[];

  @Prop({ type: mongoose.Types.ObjectId })
  uploadId: mongoose.Types.ObjectId;

  @Prop({ type: String })
  manager: string;
}

export const PurchaseClientScheme =
  SchemaFactory.createForClass(PurchaseClient);
