import * as fs from 'fs';

import { ObjectId } from 'mongodb';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Sale } from './scheme/sale.scheme';
import { Model } from 'mongoose';
import { Client } from './scheme/client.scheme';
import { SaleDownloadMapper, SaleExcelMapper, Rank } from './constant';
import { Util } from './common/helper/service.helper';
import * as ExcelJS from 'exceljs';
import { SaleListDTO } from './dto/sale.list.dto';
import { promisify } from 'util';
import * as dayjs from 'dayjs';
import { EditDashboardDTO } from './dto/edit.dashboard.dto';
import { PriceSale } from './scheme/price.sale.scheme';
import { UploadRecord } from './scheme/upload.record';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class AppService {
  constructor(
    @InjectModel(Sale.name) private saleModel: Model<Sale>,
    @InjectModel(Client.name) private clientModel: Model<Client>,
    @InjectModel(PriceSale.name) private priceSaleModel: Model<PriceSale>,
    @InjectModel(UploadRecord.name)
    private uploadRecordModel: Model<UploadRecord>,

    @Inject('rankReverse')
    private saleRankReverse: Record<number, Rank>,
    @Inject('saleExcelMapper') private saleExcelMapper: SaleExcelMapper,
    @Inject('rank') private rank: Record<Rank, number>,
    @Inject('saleDownloadMapper')
    private saleDownloadMapper: SaleDownloadMapper,
  ) {}

  async uploadSale(uploadFile: Express.Multer.File) {
    const productSet = new Set<string>();
    const clientMap = new Map<string, string>();
    const stream = new ExcelJS.stream.xlsx.WorkbookReader(uploadFile.path, {});
    const newDocument = [];
    const newPriceSaleDocument = [];
    let rowCount = 0;
    for await (const sheet of stream) {
      for await (const row of sheet) {
        if (!row.hasValues) continue;
        if (rowCount == 0) {
          rowCount++;
          continue;
        }

        const newSale = new this.saleModel();
        const newPriceSale = new this.priceSaleModel();

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
                `엑셀 파일에 ${cell.$col$row}위치에 올바른 날짜형식을 입력해 주세요.`,
              );
            }

            value = Util.GetDateString(value.toString());
          }

          if (fieldName === 'product') {
            if (!value) {
              throw new BadRequestException(
                `엑셀 파일에 ${cell.$col$row}위치에 제품 이름이 입력되지 않았습니다.`,
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

          if (fieldName === '_id') {
            if (!value) {
              throw new BadRequestException(
                `엑셀 파일에 ${cell.$col$row}위치에 일련번호를 입력해주세요.`,
              );
            }
          }

          if (fieldName === 'rank') {
            if (!value) {
              throw new BadRequestException(
                `엑셀 파일에 ${cell.$col$row}위치에 등급 A+ 부터 D-까지 등급이 포함된 특이사항으로 적어주세요 예) 잔기스 A- `,
              );
            }

            const matchRank = (value as string).match(
              /[Aa][+-]?|[Bb][+-]?|[Cc][+-]?|[Dd][+-]?/,
            );

            if (!matchRank[0]) {
              throw new BadRequestException(
                `엑셀 파일에 ${cell.$col$row}위치에 등급 A+ 부터 D-까지 등급이 포함된 특이사항으로 적어주세요 예) 잔기스 A- `,
              );
            }

            const rank = this.rank[matchRank[0].toUpperCase()];

            if (rank != null) {
              value = rank;
            } else {
              throw new BadRequestException(
                `엑셀 파일에 ${cell.$col$row}위치에 등급 A+ 부터 D-까지 등급이 포함된 특이사항으로 적어주세요 예) 잔기스 A- `,
              );
            }
          }
          if (fieldName.toLowerCase().includes('price')) {
            if (!Util.isNumber(value)) {
              throw new BadRequestException(
                `엑셀 파일에 ${cell.$col$row}위치에 가격을 숫자로 입력해주세요. `,
              );
            }
          }

          newSale[fieldName as string] = value;

          const isExist = newPriceSale.schema.path(fieldName);
          if (isExist) newPriceSale[fieldName] = value;

          const isValid = newSale.$isValid(fieldName);

          if (!isValid) {
            throw new BadRequestException(
              `엑셀 파일에 ${cell.$col$row}위치의 ${fieldName}의 값인 ${value}은 잘못된 형식의 값 입니다. ${target.instance}타입의 값으로 바꾸어 주세요`,
            );
          }
        }

        await newSale.validate();
        await newPriceSale.validate();
        const obj = newSale.toObject();
        const priceObj = newPriceSale.toObject();
        newDocument.push(obj);
        newPriceSaleDocument.push(priceObj);

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

      await this.clientModel.bulkWrite(
        Array.from(clientMap).map(([clientId, lastOutDate]) => ({
          updateOne: {
            filter: { _id: clientId },
            update: [
              {
                $set: {
                  backupLastOutDate: '$lastOutDate',
                },
              },
              {
                $set: {
                  lastOutDate,
                },
              },
            ],
            upsert: true,
          },
        })),
      );

      const ids = newDocument.map((item) => item._id);
      const hasSameId = ids.length !== new Set(ids).size;
      if (hasSameId) {
        throw new BadRequestException(
          '엑셀파일에 같은 일련번호가 입력되어 있습니다. 중복되는 일련번호가 제거해주세요.',
        );
      }

      const duplicatedItems = await this.saleModel.find({ _id: { $in: ids } });
      if (duplicatedItems.length) {
        const duplicatedIds = duplicatedItems.map((item) => item._id).join(',');
        throw new BadRequestException(
          `${duplicatedIds}는 이미 입력되어 있는 일련번호 입니다.`,
        );
      }

      const priceIds = newPriceSaleDocument.map((item) => item._id);
      const duplicatedPriceItems = await this.priceSaleModel.find({
        _id: { $in: priceIds },
      });
      if (duplicatedPriceItems.length) {
        const duplicatedPriceIds = duplicatedPriceItems
          .map((item) => item._id)
          .join(',');
        throw new BadRequestException(
          `${duplicatedPriceIds}는 이미 입력되어 있는 일련번호 입니다.`,
        );
      }

      await this.saleModel.bulkWrite(
        newDocument.map((document) => ({
          insertOne: { document },
        })),
      );

      await this.priceSaleModel.bulkWrite(
        newPriceSaleDocument.map((document) => ({
          insertOne: { document },
        })),
      );

      break;
    }

    await this.unlinkExcelFile(uploadFile.path);
    const recordDoc = new this.uploadRecordModel();
    await recordDoc.save();
  }

  async saleList({
    keyword = '',
    length,
    page,
    sort = [['updatedAt', -1]],
  }: SaleListDTO) {
    const filter = {
      product: { $regex: keyword, $options: 'i' },
    };
    const totalCount = await this.saleModel.countDocuments(filter);
    const hasNext = totalCount > page * length;
    const sortObj = Object.fromEntries(sort);
    const data = await this.saleModel
      .find(filter)
      .sort({ ...sortObj, _id: 1 })
      .skip((page - 1) * length)
      .limit(length);

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

  async dashboardData() {
    const monthSale = await this.priceSaleModel.aggregate([
      {
        $match: {
          outDate: {
            $gte: Util.GetMonthAgo(),
          },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          accOutPrice: { $sum: '$outPrice' },
          accInPrice: { $sum: '$inPrice' },
        },
      },
      {
        $addFields: {
          accMargin: { $subtract: ['$accInPrice', '$accOutPrice'] },
          accMarginRate: {
            $multiply: [
              {
                $divide: [
                  { $subtract: ['$accInPrice', '$accOutPrice'] },
                  '$accOutPrice',
                ],
              },
              100,
            ],
          },
        },
      },
    ]);

    const todaySale = await this.priceSaleModel.aggregate([
      {
        $match: {
          outDate: {
            $gte: Util.GetToday(),
          },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          accOutPrice: { $sum: '$outPrice' },
          accInPrice: { $sum: '$inPrice' },
        },
      },
      {
        $addFields: {
          accMargin: { $subtract: ['$accInPrice', '$accOutPrice'] },
          accMarginRate: {
            $multiply: [
              {
                $divide: [
                  { $subtract: ['$accInPrice', '$accOutPrice'] },
                  '$accOutPrice',
                ],
              },
              100,
            ],
          },
        },
      },
    ]);

    const monthTopProduct = await this.priceSaleModel.aggregate([
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
            $multiply: [
              {
                $divide: ['$accMargin', '$accPrice'],
              },
              100,
            ],
          },
        },
      },
      {
        $project: {
          _id: 0,
        },
      },
    ]);

    const monthTopClient = await this.saleModel.aggregate([
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
            $multiply: [
              {
                $divide: ['$accMargin', '$accPrice'],
              },
              100,
            ],
          },
        },
      },
      {
        $project: {
          _id: 0,
        },
      },
    ]);

    const todayTopProduct = await this.priceSaleModel.aggregate([
      {
        $match: {
          outDate: {
            $gte: Util.GetToday(),
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
            $multiply: [
              {
                $divide: ['$accMargin', '$accPrice'],
              },
              100,
            ],
          },
        },
      },
      {
        $project: {
          _id: 0,
        },
      },
    ]);

    const todayTopClient = await this.saleModel.aggregate([
      {
        $match: {
          outDate: {
            $gte: Util.GetToday(),
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
            $multiply: [
              {
                $divide: ['$accMargin', '$accPrice'],
              },
              100,
            ],
          },
        },
      },
      {
        $project: {
          _id: 0,
        },
      },
    ]);

    const notVisitedOutClient = await this.clientModel
      .find({ lastOutDate: { $exists: true } })
      .sort({ lastOutDate: -1, _id: 1 })
      .limit(10);

    return {
      monthSale,
      todaySale,
      monthTopProduct,
      monthTopClient,
      todayTopProduct,
      todayTopClient,
      notVisitedOutClient,
    };
  }

  async reset() {
    await this.uploadRecordModel.deleteMany();
    await this.priceSaleModel.deleteMany();
    await this.saleModel.deleteMany();
    await this.clientModel.deleteMany();
  }

  async uploadRecordList() {
    return this.uploadRecordModel.find({});
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

  async deleteRecordByTime(time: Date) {
    await this.uploadRecordModel.deleteOne({
      createdAt: time,
    });

    await this.saleModel.deleteMany({
      $or: [
        {
          updatedAt: time,
        },
        {
          createdAt: time,
        },
      ],
    });
    await this.priceSaleModel.deleteMany({
      createdAt: time,
    });

    await this.priceSaleModel.aggregate([
      {
        $match: {
          createdAt: time,
        },
      },
      {
        $addFields: {
          lastOutDate: '$backupLastOutDate',
          backupLastOutDate: null,
        },
      },
      {
        $merge: {
          into: 'clients',
          on: '_id',
          whenMatched: 'replace',
        },
      },
    ]);
  }

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async deleteUploadRecord() {
    await this.uploadRecordModel.deleteMany({});
  }

  @Cron('0 0 * * 0')
  async deleteSale() {
    await this.saleModel.deleteMany({});
  }

  private async unlinkExcelFile(filePath: string) {
    const unlinkAsync = promisify(fs.unlink);
    await unlinkAsync(filePath);
  }
}
