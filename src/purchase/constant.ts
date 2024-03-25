import { IPurchase } from './../scheme/purchase.scheme';
import { Column } from '../common/type';

export type PurchaseExcelMapper = Record<number, keyof IPurchase>;
export const purchaseExcelMapper: PurchaseExcelMapper = {
  1: 'inDate',
  3: 'inClient',
  6: 'product',
  8: 'imei',
  18: 'inPrice',
  19: 'note',
};

export type PurchaseDownloadMapper = Column<keyof IPurchase>[];

export const purchaseDownloadMapper: PurchaseDownloadMapper = [
  { header: '매입일', key: 'inDate' },
  { header: '매입처', key: 'inClient' },
  { header: '펫네임', key: 'product' },
  { header: 'IMEI', key: 'imei' },
  { header: '실매입가', key: 'inPrice' },
  { header: '특이사항', key: 'note' },
];
