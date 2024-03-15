import { Column } from './common/type';
import { ISale } from './scheme/sale.scheme';

export type SaleExcelMapper = Record<number, keyof ISale>;
export const saleExcelMapper: SaleExcelMapper = {
  1: 'inDate',
  2: 'inClient',
  3: 'outDate',
  4: 'outClient',
  7: 'product',
  8: '_id',
  9: 'imei',
  13: 'inPrice',
  17: 'outPrice',
  18: 'margin',
  19: 'marginRate',
  28: 'note',
};

export type Rank =
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
export const rank: Record<Rank, number> = {
  'A+': 0,
  A: 1,
  'A-': 2,
  'B+': 3,
  B: 4,
  'B-': 5,
  'C+': 6,
  C: 7,
  'C-': 8,
  'D+': 9,
  D: 10,
  'D-': 11,
};

export const rankReverse: Record<number, Rank> = {
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

export type SaleDownloadMapper = Column<keyof ISale>[];

export const saleDownloadMapper: SaleDownloadMapper = [
  { header: '매입일', key: 'inDate' },
  { header: '매입처', key: 'inClient' },
  { header: '판매일', key: 'outDate' },
  { header: '판매처', key: 'outClient' },
  { header: '펫네임', key: 'product' },
  { header: '일련번호', key: '_id' },
  { header: 'IMEI', key: 'imei' },
  { header: '실매입가', key: 'inPrice' },
  { header: '실판매가', key: 'outPrice' },
  { header: '손익', key: 'margin' },
  { header: '수익율', key: 'marginRate' },
  { header: '특이사항', key: 'note' },
];
