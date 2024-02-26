import { IPurchase } from './scheme/purchase.scheme';
import { ISale } from './scheme/sale.scheme';

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
  'A-',
  'A',
  'B+',
  'B-',
  'B',
  'C+',
  'C-',
  'C',
  'D',
  'D+',
  'D-',
];
