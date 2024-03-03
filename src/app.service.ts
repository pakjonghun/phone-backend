import { ObjectId } from 'mongodb';
import * as fs from 'fs';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Sale } from './scheme/sale.scheme';
import { Model, PipelineStage, SortOrder } from 'mongoose';
import { Product } from './scheme/product.scheme';
import { Client } from './scheme/client.scheme';
import {
  PurchaseExcelMapper,
  SaleDownloadMapper,
  SaleExcelMapper,
  SaleRank,
} from './constant';
import { Util } from './common/helper/service.helper';
import * as ExcelJS from 'exceljs';
import { Purchase } from './scheme/purchase.scheme';
import { SaleListDTO } from './dto/sale.list.dto';
import { Cron, CronExpression } from '@nestjs/schedule';
import { promisify } from 'util';
import { PurchaseListDTO } from './dto/purchase.list.dto';
// import { SaleListDTO } from './dto/saleList.dto';

@Injectable()
export class AppService {
  constructor(
    @InjectModel(Sale.name) private saleModel: Model<Sale>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(Client.name) private clientModel: Model<Client>,
    @InjectModel(Purchase.name) private purchaseModel: Model<Purchase>,

    @Inject('saleRankReverse')
    private saleRankReverse: Record<number, SaleRank>,
    @Inject('saleExcelMapper') private saleExcelMapper: SaleExcelMapper,
    @Inject('saleRank') private saleRank: SaleRank[],
    @Inject('saleDownloadMapper')
    private saleDownloadMapper: SaleDownloadMapper,
    @Inject('purchaseExcelMapper')
    private purchaseExcelMapper: PurchaseExcelMapper,
  ) {}

  async uploadPurchase(uploadFile: Express.Multer.File) {
    const productSet = new Set<string>();
    const clientSet = new Set<string>();
    const stream = new ExcelJS.stream.xlsx.WorkbookReader(uploadFile.path, {});
    const newDocument = [];
    let rowCount = 0;

    for await (const sheet of stream) {
      for await (const row of sheet) {
        if (!row.hasValues) continue;
        if (rowCount == 0) {
          rowCount++;
          continue;
        }

        const newPurchase = new this.purchaseModel();

        const columnArray = Array.from(
          { length: row.cellCount },
          (_, k) => k + 1,
        );

        for await (const length of columnArray) {
          const cell = row.getCell(length);
          const fieldName = this.purchaseExcelMapper[length] as string;
          if (!fieldName) continue;
          const target = newPurchase.schema.path(fieldName)!;

          let value =
            typeof cell.value == 'string' ? cell.value.trim() : cell.value;
          if (fieldName.toLowerCase().includes('date')) {
            if (!value) {
              throw new BadRequestException(
                `엑셀 파일에 ${cell.$col$row}위치의 ${fieldName}의 값인 ${value}은 잘못된 형식의 값 입니다.`,
              );
            }

            value = Util.GetDateString(value.toString());
          }

          if (fieldName === 'product') {
            if (!value) {
              throw new BadRequestException(
                `엑셀 파일에 ${cell.$col$row}위치의 ${fieldName}의 값인 ${value}은 잘못된 형식의 값 입니다.`,
              );
            }
            const modelNumber = value as string;
            productSet.add(modelNumber);
          }

          if (fieldName.toLowerCase().includes('client')) {
            clientSet.add(value as string);
          }

          if (fieldName === 'rank') {
            if (!value) {
              throw new BadRequestException(
                `엑셀 파일에 ${cell.$col$row}위치의 ${fieldName}의 값인 ${value}은 잘못된 형식의 값 입니다. (등급 A+ ~ D-까지 등급이 포함된 특이사항으로 적어주세요)`,
              );
            }

            const rank = this.saleRank.findIndex((item) =>
              value.toString().toUpperCase().includes(item),
            );
            if (rank !== -1) {
              value = rank;
            } else {
              throw new BadRequestException(
                `엑셀 파일에 ${cell.$col$row}위치의 ${fieldName}의 값인 ${value}은 잘못된 형식의 값 입니다. (등급 A+ ~ D-까지 등급이 포함된 특이사항으로 적어주세요)`,
              );
            }
          }
          newPurchase[fieldName as string] = value;
          const isValid = newPurchase.$isValid(fieldName);

          if (!isValid) {
            throw new BadRequestException(
              `엑셀 파일에 ${cell.$col$row}위치의 ${fieldName}의 값인 ${value}은 잘못된 형식의 값 입니다. ${target.instance}타입의 값으로 바꾸어 주세요`,
            );
          }
        }

        await this.productModel.bulkWrite(
          Array.from(productSet).map((productId) => ({
            updateOne: {
              filter: { _id: productId },
              update: {},
              upsert: true,
            },
          })),
        );

        await this.clientModel.bulkWrite(
          Array.from(clientSet).map((clientId) => ({
            updateOne: {
              filter: { _id: clientId },
              update: {},
              upsert: true,
            },
          })),
        );

        newPurchase.isConfirmed = false;
        await newPurchase.validate();
        const obj = newPurchase.toObject();
        delete obj._id;
        newDocument.push(obj);
      }

      if (newDocument.length === 0) {
        throw new BadRequestException('입력 가능한 데이터가 없습니다.');
      }

      await this.purchaseModel.bulkWrite(
        newDocument.map((document) => ({
          insertOne: { document },
        })),
      );

      break;
    }

    await this.unlinkExcelFile(uploadFile.path);
  }

  async uploadSale(uploadFile: Express.Multer.File) {
    const productSet = new Set<string>();
    const clientSet = new Set<string>();
    const stream = new ExcelJS.stream.xlsx.WorkbookReader(uploadFile.path, {});
    const newDocument = [];
    let rowCount = 0;

    for await (const sheet of stream) {
      for await (const row of sheet) {
        if (!row.hasValues) continue;
        if (rowCount == 0) {
          rowCount++;
          continue;
        }

        const newSale = new this.saleModel();

        const columnArray = Array.from(
          { length: row.cellCount },
          (_, k) => k + 1,
        );

        for await (const length of columnArray) {
          const cell = row.getCell(length);
          const fieldName = this.saleExcelMapper[length] as string;
          if (!fieldName) continue;
          const target = newSale.schema.path(fieldName)!;

          let value =
            typeof cell.value == 'string' ? cell.value.trim() : cell.value;
          if (fieldName.toLowerCase().includes('date')) {
            if (!value) {
              throw new BadRequestException(
                `엑셀 파일에 ${cell.$col$row}위치의 ${fieldName}의 값인 ${value}은 잘못된 형식의 값 입니다.`,
              );
            }

            value = Util.GetDateString(value.toString());
          }

          if (fieldName === 'product') {
            if (!value) {
              throw new BadRequestException(
                `엑셀 파일에 ${cell.$col$row}위치의 ${fieldName}의 값인 ${value}은 잘못된 형식의 값 입니다.`,
              );
            }
            const modelNumber = value as string;
            productSet.add(modelNumber);
          }

          if (fieldName.toLowerCase().includes('client')) {
            clientSet.add(value as string);
          }

          if (fieldName === 'rank') {
            if (!value) {
              throw new BadRequestException(
                `엑셀 파일에 ${cell.$col$row}위치의 ${fieldName}의 값인 ${value}은 잘못된 형식의 값 입니다. (등급 A+ ~ D-까지 등급이 포함된 특이사항으로 적어주세요)`,
              );
            }

            const rank = this.saleRank.findIndex((item) =>
              value.toString().toUpperCase().includes(item),
            );
            if (rank !== -1) {
              value = rank;
            } else {
              throw new BadRequestException(
                `엑셀 파일에 ${cell.$col$row}위치의 ${fieldName}의 값인 ${value}은 잘못된 형식의 값 입니다. (등급 A+ ~ D-까지 등급이 포함된 특이사항으로 적어주세요)`,
              );
            }
          }
          newSale[fieldName as string] = value;
          const isValid = newSale.$isValid(fieldName);

          if (!isValid) {
            throw new BadRequestException(
              `엑셀 파일에 ${cell.$col$row}위치의 ${fieldName}의 값인 ${value}은 잘못된 형식의 값 입니다. ${target.instance}타입의 값으로 바꾸어 주세요`,
            );
          }
        }

        await this.productModel.bulkWrite(
          Array.from(productSet).map((productId) => ({
            updateOne: {
              filter: { _id: productId },
              update: {},
              upsert: true,
            },
          })),
        );

        await this.clientModel.bulkWrite(
          Array.from(clientSet).map((clientId) => ({
            updateOne: {
              filter: { _id: clientId },
              update: {},
              upsert: true,
            },
          })),
        );

        newSale.isConfirmed = false;
        await newSale.validate();
        newSale.isConfirmed = false;
        await newSale.validate();
        const obj = newSale.toObject();
        delete obj._id;
        newDocument.push(obj);
      }

      if (newDocument.length === 0) {
        throw new BadRequestException('입력 가능한 데이터가 없습니다.');
      }

      await this.saleModel.bulkWrite(
        newDocument.map((document) => ({
          insertOne: { document },
        })),
      );

      break;
    }

    await this.unlinkExcelFile(uploadFile.path);
  }

  async saleList({
    keyword,
    length,
    page,
    sort = [['updatedAt', -1]],
  }: SaleListDTO) {
    const filter = {
      product: { $regex: keyword, $options: 'i' },
    };

    const totalCount = await this.saleModel.countDocuments(filter);
    const hasNext = totalCount > page * length;

    const sortList = sort.map((item) => {
      return [item[0], Number(item[1])];
    }) as [string, SortOrder][];

    const pipe: PipelineStage[] = [
      {
        $match: filter,
      },
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'product',
        },
      },

      {
        $unwind: '$product',
      },
      {
        $skip: (page - 1) * length,
      },
      {
        $limit: length,
      },
      {
        $project: {
          distanceLog: 1,
          isConfirmed: 1,
          product: 1,
          rank: 1,
          _id: 1,
        },
      },
    ];

    if (sortList.length) {
      const parseSortList = sortList.map(([sortKey, order]) => {
        switch (sortKey) {
          case 'belowAverageCount':
          case 'recentHighSalePrice':
          case 'recentLowPrice':
            return [`product.${sortKey}`, order];

          default:
            return [sortKey, order];
        }
      });

      const objectSortList = Object.fromEntries(parseSortList);
      const skipIndex = pipe.findIndex((item) => {
        const stageKey = Object.keys(item)[0];
        return stageKey === '$skip';
      });
      pipe.splice(skipIndex, 0, { $sort: objectSortList });
    }

    const data = await this.saleModel.aggregate(pipe);

    return {
      totalCount,
      hasNext,
      data,
    };
  }

  async purchaseList({
    keyword,
    length,
    page,
    sort = [['updatedAt', -1]],
  }: PurchaseListDTO) {
    const filter = {
      product: { $regex: keyword, $options: 'i' },
    };

    const totalCount = await this.purchaseModel.countDocuments(filter);
    const hasNext = totalCount > page * length;

    const sortList = sort.map((item) => {
      return [item[0], Number(item[1])];
    }) as [string, SortOrder][];

    const pipe: PipelineStage[] = [
      {
        $match: filter,
      },
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'product',
        },
      },

      {
        $unwind: '$product',
      },
      {
        $skip: (page - 1) * length,
      },
      {
        $limit: length,
      },
      {
        $project: {
          distanceLog: 1,
          isConfirmed: 1,
          product: 1,
          rank: 1,
          _id: 1,
        },
      },
    ];

    if (sortList.length) {
      const parseSortList = sortList.map(([sortKey, order]) => {
        switch (sortKey) {
          case 'recentHighPurchasePrice':
          case 'recentLowPurchasePrice':
          case 'belowAveragePurchaseCount':
            return [`product.${sortKey}`, Number(order)];

          default:
            return [sortKey, Number(order)];
        }
      });

      const objectSortList = Object.fromEntries(parseSortList);
      const skipIndex = pipe.findIndex((item) => {
        const stageKey = Object.keys(item)[0];
        return stageKey === '$skip';
      });
      pipe.splice(skipIndex, 0, { $sort: objectSortList });
    }

    const data = await this.purchaseModel.aggregate(pipe);

    return {
      totalCount,
      hasNext,
      data,
    };
  }

  async downloadSale(idList: string[]) {
    type Result = {
      distanceLog: 1;
      product: string;
      rank: number;
      recentHighSalePrice: number;
      recentLowPrice: number;
      belowAverageCount: number;
      isConfirmed: boolean;
    };

    const objectIds = idList.map((id) => new ObjectId(id));
    const stream = await this.saleModel.aggregate<Result>([
      {
        $match: { _id: { $in: objectIds } },
      },
      {
        $lookup: {
          from: 'products',
          foreignField: '_id',
          localField: 'product',
          as: 'product',
        },
      },
      {
        $unwind: '$product',
      },
      {
        $addFields: {
          product: '$product._id',
          recentHighSalePrice: '$product.recentHighSalePrice',
          recentLowPrice: '$product.recentLowPrice',
          belowAverageCount: '$product.belowAverageCount',
        },
      },
      {
        $project: {
          _id: 0,
          distanceLog: 1,
          product: 1,
          rank: 1,
          recentHighSalePrice: 1,
          recentLowPrice: 1,
          belowAverageCount: 1,
          isConfirmed: 1,
        },
      },
    ]);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('판매시트');

    worksheet.columns = [
      { header: '펫네임', key: 'product' },
      { header: '등급', key: 'rank' },
      { header: '차감내역', key: 'distanceLog' },
      { header: '최근 고가 판매가', key: 'recentHighSalePrice' },
      { header: '최근 저가 판매가', key: 'recentLowPrice' },
      { header: '평균 이하 판매수', key: 'belowAverageCount' },
      { header: '관리자 승인여부', key: 'isConfirmed' },
    ];

    for await (const doc of stream) {
      const newDoc = {
        product: doc.product,
        rank: this.saleRankReverse[doc.rank] ?? '',
        distanceLog: doc.distanceLog ?? '',
        recentHighSalePrice: doc.recentHighSalePrice,
        recentLowPrice: doc.recentLowPrice,
        belowAverageCount: doc.belowAverageCount,
        isConfirmed: doc.isConfirmed ? '승인대기' : '승인완료',
      };

      worksheet.addRow(newDoc);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }
  async downloadPurchase(idList: string[]) {
    type Result = {
      distanceLog: 1;
      product: string;
      rank: number;
      recentHighPurchasePrice: number;
      recentLowPurchasePrice: number;
      belowAveragePurchaseCount: number;
      isConfirmed: boolean;
    };

    const objectIds = idList.map((id) => new ObjectId(id));
    const stream = await this.purchaseModel.aggregate<Result>([
      {
        $match: { _id: { $in: objectIds } },
      },
      {
        $lookup: {
          from: 'products',
          foreignField: '_id',
          localField: 'product',
          as: 'product',
        },
      },
      {
        $unwind: '$product',
      },
      {
        $addFields: {
          product: '$product._id',
          recentHighPurchasePrice: '$product.recentHighPurchasePrice',
          recentLowPurchasePrice: '$product.recentLowPurchasePrice',
          belowAveragePurchaseCount: '$product.belowAveragePurchaseCount',
        },
      },
      {
        $project: {
          _id: 0,
          distanceLog: 1,
          product: 1,
          rank: 1,
          recentHighPurchasePrice: 1,
          recentLowPurchasePrice: 1,
          belowAveragePurchaseCount: 1,
          isConfirmed: 1,
        },
      },
    ]);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('매입시트');

    worksheet.columns = [
      { header: '펫네임', key: 'product' },
      { header: '등급', key: 'rank' },
      { header: '차감내역', key: 'distanceLog' },
      { key: 'recentHighPurchasePrice', header: '최근 고가매입가' },
      { key: 'recentLowPurchasePrice', header: '최근 저가매입가' },
      { key: 'belowAveragePurchaseCount', header: '최근 평균가 이상 매입수' },
      { header: '관리자 승인여부', key: 'isConfirmed' },
    ];

    for await (const doc of stream) {
      const newDoc = {
        product: doc.product,
        rank: this.saleRankReverse[doc.rank] ?? '',
        distanceLog: doc.distanceLog ?? '',
        recentHighPurchasePrice: doc.recentHighPurchasePrice,
        recentLowPurchasePrice: doc.recentLowPurchasePrice,
        belowAveragePurchaseCount: doc.belowAveragePurchaseCount,
        isConfirmed: doc.isConfirmed ? '승인대기' : '승인완료',
      };

      worksheet.addRow(newDoc);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  async confirmSale(idList: string[]) {
    const result = await this.saleModel.updateMany(
      {
        _id: { $in: idList },
      },
      { $set: { isConfirmed: true } },
    );

    if (result.modifiedCount !== idList.length) {
      throw new BadRequestException(
        `${idList.length}개 데이터 중 ${result.modifiedCount}개 데이터만 승인이 완료되었습니다.`,
      );
    }
  }

  async confirmPurchase(idList: string[]) {
    const result = await this.purchaseModel.updateMany(
      {
        _id: { $in: idList },
      },
      { $set: { isConfirmed: true } },
    );

    if (result.modifiedCount !== idList.length) {
      throw new BadRequestException(
        `${idList.length}개 데이터 중 ${result.modifiedCount}개 데이터만 승인이 완료되었습니다.`,
      );
    }
  }

  @Cron(CronExpression.EVERY_10_HOURS)
  async calculateProduct() {
    const aMonthAgo = Util.GetMonthAgo();
    const pipe: PipelineStage[] = [
      {
        $match: {
          outDate: { $gte: aMonthAgo },
        },
      },
      {
        $group: {
          _id: '$product',
          recentHighSalePrice: { $max: '$outPrice' },
          recentLowPrice: { $min: '$outPrice' },
          totalOutPrice: { $sum: '$outPrice' },
          count: { $sum: 1 },
          allOutPrices: { $push: '$outPrice' },
        },
      },
      {
        $addFields: {
          averageSalePrice: {
            $divide: ['$totalOutPrice', '$count'],
          },
        },
      },
      {
        $addFields: {
          belowAverageCount: {
            $size: {
              $filter: {
                input: '$allOutPrices',
                as: 'price',
                cond: { $lte: ['$$price', '$averageSalePrice'] },
              },
            },
          },
        },
      },
      {
        $project: {
          recentHighSalePrice: 1,
          recentLowPrice: 1,
          belowAverageCount: 1,
        },
      },
      {
        $merge: {
          into: 'products',
          on: '_id',
          whenMatched: 'merge',
          whenNotMatched: 'discard',
        },
      },
    ];

    await this.saleModel.aggregate(pipe);
  }

  @Cron(CronExpression.EVERY_10_HOURS)
  async calculateProductByPurchase() {
    const aMonthAgo = Util.GetMonthAgo();
    const pipe: PipelineStage[] = [
      {
        $match: {
          inDate: { $gte: aMonthAgo },
        },
      },
      {
        $group: {
          _id: '$product',
          recentHighPurchasePrice: { $max: '$inPrice' },
          recentLowPurchasePrice: { $min: '$inPrice' },
          totalInPrice: { $sum: '$inPrice' },
          count: { $sum: 1 },
          allInPrices: { $push: '$inPrice' },
        },
      },
      {
        $addFields: {
          averagePurchasePrice: {
            $divide: ['$totalInPrice', '$count'],
          },
        },
      },
      {
        $addFields: {
          belowAveragePurchaseCount: {
            $size: {
              $filter: {
                input: '$allInPrices',
                as: 'price',
                cond: { $gte: ['$$price', '$averagePurchasePrice'] },
              },
            },
          },
        },
      },
      {
        $project: {
          recentHighPurchasePrice: 1,
          recentLowPurchasePrice: 1,
          belowAveragePurchaseCount: 1,
        },
      },
      {
        $merge: {
          into: 'products',
          on: '_id',
          whenMatched: 'merge',
          whenNotMatched: 'discard',
        },
      },
    ];

    await this.purchaseModel.aggregate(pipe);
  }

  private async unlinkExcelFile(filePath: string) {
    const unlinkAsync = promisify(fs.unlink);
    await unlinkAsync(filePath);
  }
}
