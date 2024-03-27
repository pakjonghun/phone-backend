import { purchaseDownloadMapper, purchaseExcelMapper } from './constant';
import { Module } from '@nestjs/common';
import { PurchaseService } from './purchase.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Purchase, PurchaseScheme } from 'src/scheme/purchase.scheme';
import { PurchaseController } from './purchase.controller';
import {
  PurchaseClient,
  PurchaseClientScheme,
} from 'src/scheme/purchase.client.scheme';
import {
  UploadPurchaseRecord,
  UploadPurchaseRecordScheme,
} from 'src/scheme/upload.purchase.record';

@Module({
  exports: [PurchaseService],
  imports: [
    MongooseModule.forFeature([
      { name: Purchase.name, schema: PurchaseScheme },
      { name: PurchaseClient.name, schema: PurchaseClientScheme },
      { name: UploadPurchaseRecord.name, schema: UploadPurchaseRecordScheme },
    ]),
  ],
  providers: [
    PurchaseService,
    {
      provide: 'purchaseExcelMapper',
      useValue: purchaseExcelMapper,
    },
    {
      provide: 'purchaseDownloadMapper',
      useValue: purchaseDownloadMapper,
    },
  ],
  controllers: [PurchaseController],
})
export class PurchaseModule {}
