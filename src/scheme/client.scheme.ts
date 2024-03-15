import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export interface IClient {
  backupLastOutDate: string;
  lastOutDate: string;
  note: string;
}

export type SaleDocument = HydratedDocument<Client>;

@Schema({ timestamps: true, versionKey: false })
export class Client implements IClient {
  @Prop()
  _id: string;

  @Prop({ type: String })
  backupLastOutDate: string;

  @Prop({ type: String })
  lastOutDate: string;

  @Prop({ type: String })
  note: string;
}

export const ClientScheme = SchemaFactory.createForClass(Client);
