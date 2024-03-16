import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export interface IClient {
  backupLastOutDate: string[];
  lastOutDate: string;
  note: string;
  uploadId: mongoose.Types.ObjectId;
  backupUploadId: mongoose.Types.ObjectId[];
}

export type SaleDocument = HydratedDocument<Client>;

@Schema({ timestamps: true, versionKey: false })
export class Client implements IClient {
  @Prop()
  _id: string;

  @Prop({ type: [String] })
  backupLastOutDate: string[];

  @Prop({ type: String })
  lastOutDate: string;

  @Prop({ type: String })
  note: string;

  @Prop({ type: [mongoose.Types.ObjectId] })
  backupUploadId: mongoose.Types.ObjectId[];

  @Prop({ type: mongoose.Types.ObjectId })
  uploadId: mongoose.Types.ObjectId;
}

export const ClientScheme = SchemaFactory.createForClass(Client);
