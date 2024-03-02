import { Column } from './common/type';
import { Product } from './scheme/product.scheme';
import { IPurchase } from './scheme/purchase.scheme';
import { ISale, Sale } from './scheme/sale.scheme';

export type PurchaseExcelMapper = Record<number, keyof IPurchase>;
export const purchaseExcelMapper: PurchaseExcelMapper = {
  1: 'date',
  18: 'price',
  3: 'client',
  6: 'product',
};

export type SaleExcelMapper = Record<number, keyof ISale>;
export const saleExcelMapper: SaleExcelMapper = {
  3: 'outDate',
  1: 'inDate',
  7: 'product',
  28: 'rank',
  26: 'distanceLog',
  2: 'inClient',
  4: 'outClient',
  13: 'inPrice',
  17: 'outPrice',
};

export type SaleRank =
  | 'A+'
  | 'A-'
  | 'A'
  | 'B+'
  | 'B-'
  | 'B'
  | 'C+'
  | 'C-'
  | 'C'
  | 'D'
  | 'D+'
  | 'D-';
export const saleRank: SaleRank[] = [
  'A+',
  'A',
  'A-',
  'B+',
  'B',
  'B-',
  'C+',
  'C',
  'C-',
  'D+',
  'D',
  'D-',
];

export type SaleDownloadMapper = Column<
  keyof (Product &
    Pick<Sale, 'product' | 'distanceLog' | 'isConfirmed' | 'rank' | 'outPrice'>)
>[];

export const saleDownloadMapper: SaleDownloadMapper = [
  { key: 'product', header: '펫네임' },
  { key: 'rank', header: '등급' },
  { key: 'distanceLog', header: '차감내역' },
  { key: 'recentHighSalePrice', header: '최근 고가 판매가' },
  { key: 'recentLowPrice', header: '최근 저가 판매가' },
  { key: 'belowAverageCount', header: '평균 이하 판매수' },
  { key: 'isConfirmed', header: '등급' },
];
