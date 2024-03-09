import { ObjectId } from 'mongodb';
import * as fs from 'fs';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Sale } from './scheme/sale.scheme';
import { Model, PipelineStage, SortOrder } from 'mongoose';
import { Product } from './scheme/product.scheme';
import { Client } from './scheme/client.scheme';
import {
  MarginDownloadMapper,
  PurchaseExcelMapper,
  SaleDownloadMapper,
  SaleExcelMapper,
  Rank,
} from './constant';
import { Util } from './common/helper/service.helper';
import * as ExcelJS from 'exceljs';
import { Purchase } from './scheme/purchase.scheme';
import { SaleListDTO } from './dto/sale.list.dto';
import { Cron, CronExpression } from '@nestjs/schedule';
import { promisify } from 'util';
import { PurchaseListDTO } from './dto/purchase.list.dto';
import { MarginListDTO } from './dto/margin.list.dto';
import * as dayjs from 'dayjs';
import { EditDashboardDTO } from './dto/edit.dashboard.dto';

@Injectable()
export class AppService {
  constructor(
    @InjectModel(Sale.name) private saleModel: Model<Sale>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(Client.name) private clientModel: Model<Client>,
    @InjectModel(Purchase.name) private purchaseModel: Model<Purchase>,

    @Inject('rankReverse')
    private saleRankReverse: Record<number, Rank>,
    @Inject('saleExcelMapper') private saleExcelMapper: SaleExcelMapper,
    @Inject('rank') private rank: Record<Rank, number>,
    @Inject('saleDownloadMapper')
    private saleDownloadMapper: SaleDownloadMapper,
    @Inject('purchaseExcelMapper')
    private purchaseExcelMapper: PurchaseExcelMapper,
    @Inject('marginDownloadMapper')
    private marginDownloadMapper: MarginDownloadMapper,
  ) {}

  async uploadPurchase(uploadFile: Express.Multer.File) {
    const productSet = new Set<string>();
    const clientMap = new Map<string, string>();
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

          if (fieldName.toLowerCase() === 'outClient') {
            const stringValue = value as string;
            if (!clientMap.has(stringValue)) {
              clientMap.set(stringValue, '');
            }
          }

          if (fieldName === 'rank') {
            if (!value) {
              throw new BadRequestException(
                `엑셀 파일에 ${cell.$col$row}위치의 ${fieldName}의 값인 ${value}은 잘못된 형식의 값 입니다. (등급 A+ ~ D-까지 등급이 포함된 특이사항으로 적어주세요)`,
              );
            }

            const rank = this.rank[value.toString().toUpperCase()];
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

        newPurchase.isConfirmed = false;

        await newPurchase.validate();

        const obj = newPurchase.toObject();
        delete obj._id;

        const inDate = newPurchase.inDate;
        const inClient = newPurchase.inClient as unknown as string;
        const existClientInDate = clientMap.get(inClient);

        if (existClientInDate) {
          const isInDateLatest = dayjs(inDate).isAfter(
            dayjs(existClientInDate),
          );
          if (isInDateLatest) {
            clientMap.set(inClient, inDate);
          }
        }

        if (!existClientInDate) {
          clientMap.set(inClient, inDate);
        }

        newDocument.push(obj);
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
        Array.from(clientMap).map(([clientId, lastInDate]) => ({
          updateOne: {
            filter: { _id: clientId },
            update: {
              $set: {
                lastInDate,
              },
            },
            upsert: true,
          },
        })),
      );

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
    const clientMap = new Map<string, string>();
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

          if (fieldName.toLowerCase() === 'outClient') {
            const stringValue = value as string;
            if (!clientMap.has(stringValue)) {
              clientMap.set(stringValue, '');
            }
          }

          if (fieldName === 'rank') {
            if (!value) {
              throw new BadRequestException(
                `엑셀 파일에 ${cell.$col$row}위치의 ${fieldName}의 값인 ${value}은 잘못된 형식의 값 입니다. (등급 A+ ~ D-까지 등급이 포함된 특이사항으로 적어주세요)`,
              );
            }

            const rank = this.rank[value.toString().toUpperCase()];
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

        newSale.isConfirmed = false;
        await newSale.validate();
        const obj = newSale.toObject();
        console.log(obj);
        delete obj._id;
        newDocument.push(obj);

        const outDate = newSale.outDate as string;
        const outClient = newSale.outClient as unknown as string;
        const existOutDate = clientMap.get(outClient);
        if (!existOutDate) {
          clientMap.set(outClient, outDate);
        }

        if (existOutDate) {
          const isOutDateLastest = dayjs(outDate).isAfter(dayjs(existOutDate));
          if (isOutDateLastest) {
            clientMap.set(outClient, outDate);
          }
        }
      }

      if (newDocument.length === 0) {
        throw new BadRequestException('입력 가능한 데이터가 없습니다.');
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
        Array.from(clientMap).map(([clientId, lastOutDate]) => ({
          updateOne: {
            filter: { _id: clientId },
            update: {
              $set: {
                lastOutDate,
              },
            },
            upsert: true,
          },
        })),
      );

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
      pipe.splice(skipIndex, 0, { $sort: { ...objectSortList, _id: 1 } });
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

      pipe.splice(skipIndex, 0, { $sort: { ...objectSortList, _id: 1 } });
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

    worksheet.columns = this.saleDownloadMapper;

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

  async dashboardData() {
    const topTenProduct = await this.saleModel.aggregate([
      {
        $match: {
          outDate: {
            $gte: Util.GetMonthAgo(),
          },
        },
      },
      {
        $group: {
          _id: '$product',
          count: { $sum: 1 },
          accPrice: { $sum: '$outPrice' },
          accMargin: { $sum: { $subtract: ['$outPrice', '$inPrice'] } },
          accInPrice: { $sum: '$inPrice' },
        },
      },
      {
        $sort: {
          accPrice: -1,
          count: -1,
        },
      },
      {
        $limit: 10,
      },
      {
        $addFields: {
          name: '$_id',
          marginRate: {
            $divide: ['$accPrice', '$accInPrice'],
          },
        },
      },
      {
        $project: {
          _id: 0,
        },
      },
    ]);

    const topTenClient = await this.saleModel.aggregate([
      {
        $match: {
          outDate: {
            $gte: Util.GetMonthAgo(),
          },
        },
      },
      {
        $group: {
          _id: '$outClient',
          count: { $sum: 1 },
          accMargin: {
            $sum: {
              $subtract: ['$outPrice', '$inPrice'],
            },
          },
          accPrice: { $sum: '$outPrice' },
          accInPrice: { $sum: '$inPrice' },
        },
      },
      {
        $sort: {
          accPrice: -1,
          count: -1,
        },
      },
      {
        $limit: 10,
      },

      {
        $addFields: {
          name: '$_id',
          marginRate: {
            $divide: ['$accMargin', '$accInPrice'],
          },
        },
      },
      {
        $project: {
          _id: 0,
        },
      },
    ]);

    const totalSale = await this.saleModel.aggregate([
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          accPrice: { $sum: '$outPrice' },
          accInPrice: { $sum: '$inPrice' },
          accMargin: { $sum: { $subtract: ['$outPrice', '$inPrice'] } },
        },
      },
      {
        $sort: {
          accPrice: -1,
          count: -1,
        },
      },
      {
        $limit: 10,
      },
      {
        $addFields: {
          marginRate: {
            $divide: ['$accPrice', '$accInPrice'],
          },
        },
      },
    ]);

    const notVisitedOutClient = await this.clientModel
      .find({ lastOutDate: { $exists: true } })
      .sort({ lastOutDate: -1, _id: 1 })
      .limit(10);

    const notVisitedInClient = await this.clientModel
      .find({ lastInDate: { $exists: true } })
      .sort({ lastInDate: -1, _id: 1 })
      .limit(10);

    return {
      topTenProduct,
      topTenClient,
      totalSale: totalSale[0],
      notVisitedOutClient,
      notVisitedInClient,
    };
  }

  async reset() {
    await this.productModel.deleteMany();
    await this.purchaseModel.deleteMany();
    await this.saleModel.deleteMany();
    await this.clientModel.deleteMany();
  }

  async minusMargin({
    page,
    length,
    keyword,
    sort = [['updatedAt', -1]],
    endDate,
    startDate,
  }: MarginListDTO) {
    const match: PipelineStage = {
      $match: {
        product: { $regex: keyword, $options: 'i' },
        $expr: {
          $and: [{ $lt: [{ $subtract: ['$inPrice', '$outPrice'] }, 0] }],
        },
      },
    };
    const pipe: PipelineStage[] = [
      {
        $facet: {
          data: [
            {
              $addFields: {
                outClient: '$outClient',
                margin: { $subtract: ['$outPrice', '$inPrice'] },
                marginRate: {
                  $multiply: [
                    {
                      $divide: [
                        { $subtract: ['$outPrice', '$inPrice'] },
                        '$outPrice',
                      ],
                    },
                    100,
                  ],
                },
              },
            },
            {
              $project: {
                _id: 1,
                product: 1,
                isConfirmed: 1,
                inPrice: 1,
                outPrice: 1,
                margin: 1,
                marginRate: 1,
                outClient: 1,
              },
            },
            // {
            //   $match: {
            //     margin: { $lte: 0 },
            //   },
            // },
            {
              $skip: (page - 1) * length,
            },
            {
              $limit: length,
            },
          ],
          totalCount: [{ $count: 'count' }],
        },
      },
    ];

    const sortList = sort.map((item) => {
      return [item[0], Number(item[1])];
    }) as [string, 1 | -1][];
    const objectSortList = Object.fromEntries(sortList);
    //@ts-ignore
    pipe[0].$facet.data.splice(2, 0, { $sort: { ...objectSortList, _id: 1 } });
    // pipe.splice(1, 0, { $sort: objectSortList });

    if (startDate) {
      match.$match.$expr.$and.push({ $gte: ['$inDate', startDate] });
    }

    if (endDate) {
      match.$match.$expr.$and.push({ $lte: ['$inDate', endDate] });
    }

    pipe.splice(0, 0, match);

    const result = await this.saleModel.aggregate(pipe);
    //@ts-ignore
    const data = result[0].data;

    //@ts-ignore
    const totalCount = data.length ? result[0].totalCount[0].count : 0;

    const hasNext = page * length < totalCount;

    return {
      //@ts-ignore
      data: result[0].data,
      totalCount,
      hasNext,
    };
  }

  async downloadMargin(idList: string[]) {
    type Result = {
      product: string;
      isConfirmed: boolean;
      inPrice: number;
      outPrice: number;
      margin: number;
      marginRate: number;
      outClient: string;
    };

    const objectIds = idList.map((id) => new ObjectId(id));
    const stream = await this.saleModel.aggregate<Result>([
      {
        $match: { _id: { $in: objectIds } },
      },
      {
        $addFields: {
          outClient: '$outClient',
          margin: { $subtract: ['$outPrice', '$inPrice'] },
          marginRate: {
            $multiply: [
              {
                $divide: [
                  { $subtract: ['$outPrice', '$inPrice'] },
                  '$outPrice',
                ],
              },
              100,
            ],
          },
        },
      },
      {
        $project: {
          _id: 1,
          product: 1,
          isConfirmed: 1,
          inPrice: 1,
          outPrice: 1,
          margin: 1,
          marginRate: 1,
          outClient: 1,
        },
      },
    ]);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('판매시트');

    worksheet.columns = this.marginDownloadMapper;

    for await (const doc of stream) {
      const newDoc = {
        product: doc.product,
        isConfirmed: doc.isConfirmed,
        inPrice: doc.inPrice,
        outPrice: doc.outPrice,
        margin: doc.margin,
        marginRate: doc.marginRate,
        outClient: doc.outClient,
      };

      worksheet.addRow(newDoc);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  async editDashboard(id: string, { note }: EditDashboardDTO) {
    const result = await this.clientModel.updateOne(
      { _id: id },
      { $set: { note } },
    );

    if (result.modifiedCount !== 1) {
      throw new BadRequestException('업데이트가 실패했습니다.');
    }
  }

  private async unlinkExcelFile(filePath: string) {
    const unlinkAsync = promisify(fs.unlink);
    await unlinkAsync(filePath);
  }
}
