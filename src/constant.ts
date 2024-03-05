import { Column } from './common/type';
import { Product } from './scheme/product.scheme';
import { IPurchase } from './scheme/purchase.scheme';
import { ISale, Sale } from './scheme/sale.scheme';

export type PurchaseExcelMapper = Record<number, keyof IPurchase>;
export const purchaseExcelMapper: PurchaseExcelMapper = {
  1: 'inDate',
  3: 'inClient',
  6: 'product',
  19: 'rank',
  18: 'inPrice',
  17: 'distanceLog',
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

export const saleRankReverse: Record<number, SaleRank> = {
  [0]: 'A+',
  [1]: 'A',
  [2]: 'A-',
  [3]: 'B+',
  [4]: 'B',
  [5]: 'B-',
  [6]: 'C+',
  [7]: 'C',
  [8]: 'C-',
  [9]: 'D+',
  [10]: 'D',
  [11]: 'D-',
};

export type SaleDownloadMapper = Column<
  keyof (Product &
    Pick<Sale, 'product' | 'distanceLog' | 'isConfirmed' | 'rank' | 'outPrice'>)
>[];

export const saleDownloadMapper: SaleDownloadMapper = [
  { header: '펫네임', key: 'product' },
  { header: '등급', key: 'rank' },
  { header: '차감내역', key: 'distanceLog' },
  { header: '최근 고가 판매가', key: 'recentHighSalePrice' },
  { header: '최근 저가 판매가', key: 'recentLowPrice' },
  { header: '평균 이하 판매수', key: 'belowAverageCount' },
  { header: '관리자 승인여부', key: 'isConfirmed' },
];

export type Margin = {
  product: string;
  isConfirmed: boolean;
  inPrice: number;
  outPrice: number;
  margin: number;
  marginRate: number;
  outClient: string;
};

export type MarginDownloadMapper = Column<keyof Margin>[];

export const marginDownloadMapper: MarginDownloadMapper = [
  { header: '펫네임', key: 'product' },
  { header: '판매처', key: 'outClient' },
  { header: '관리자 승인여부', key: 'isConfirmed' },
  { header: '판매가', key: 'outPrice' },
  { header: '매입가', key: 'inPrice' },
  { header: '마진', key: 'margin' },
  { header: '마진율', key: 'marginRate' },
];
