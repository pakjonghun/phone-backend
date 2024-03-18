import { ObjectId } from 'mongodb';
import * as fs from 'fs';

import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Sale } from './scheme/sale.scheme';
import mongoose, { Model } from 'mongoose';
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
    const recordDoc = new this.uploadRecordModel();
    await recordDoc.save();

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
          if (fieldName === 'imei') {
            if (!value) {
              throw new BadRequestException(
                `엑셀 파일에 ${cell.$col$row}위치에 IMEI를 입력해주세요.`,
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

        newSale.uploadId = recordDoc._id as string;
        newPriceSale.uploadId = recordDoc._id as string;
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

      const clientIds = Array.from(clientMap).map(([clientId]) => clientId);
      const existClients = await this.clientModel.find({
        _id: { $in: clientIds },
      });

      const existClientList = new Map();
      const notExistClientList = new Map();

      clientMap.forEach((value, key) => {
        const existClientIndex = existClients.findIndex(
          (item) => item._id === key,
        );
        if (existClientIndex == -1) {
          notExistClientList.set(key, value);
        } else {
          existClientList.set(key, value);
        }
      });

      const insertClientList = Array.from(notExistClientList).map(
        ([_id, lastOutDate]) =>
          new this.clientModel({
            _id,
            lastOutDate,
            uploadId: recordDoc._id as mongoose.Types.ObjectId,
            backupLastOutDate: [],
          }),
      );

      await this.clientModel.insertMany(insertClientList);
      await this.clientModel.bulkWrite(
        Array.from(existClientList).map(([clientId, lastOutDate]) => ({
          updateOne: {
            filter: { _id: clientId, lastOutDate: { $lt: lastOutDate } },
            update: [
              {
                $set: {
                  backupLastOutDate: {
                    $concatArrays: ['$backupLastOutDate', ['$lastOutDate']],
                  },
                },
              },
              {
                $set: {
                  backupUploadId: {
                    $concatArrays: ['$backupUploadId', ['$uploadId']],
                  },
                },
              },
              {
                $set: {
                  uploadId: recordDoc._id as mongoose.Types.ObjectId,
                  lastOutDate,
                },
              },
            ],
          },
        })),
      );

      const imeis = newDocument.map((item) => item.imei);
      const hasSameId = imeis.length !== new Set(imeis).size;
      if (hasSameId) {
        throw new BadRequestException(
          '엑셀파일에 같은 IMEI가 입력되어 있습니다. 중복되는 IMEI 제거해주세요.',
        );
      }

      const duplicatedItems = await this.saleModel.find({
        imei: { $in: imeis },
        createdAt: {
          $gt: dayjs().startOf('day'),
          $lt: dayjs().endOf('day'),
        },
      });
      if (duplicatedItems.length) {
        const duplicatedIds = duplicatedItems.map((item) => item._id).join(',');
        throw new BadRequestException(
          `${duplicatedIds}는 이미 입력되어 있는 IMEI입니다.`,
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
    const parseSort = sort.map(([sortKey, sortValue]) => [
      sortKey,
      Number(sortValue),
    ]);
    const sortObj = Object.fromEntries(parseSort);
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
    const stream = await this.saleModel.find({ _id: { $in: idList } });
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('판매시트');

    worksheet.columns = this.saleDownloadMapper;

    for await (const doc of stream) {
      const newDoc = {
        inDate: doc.inDate,
        inClient: doc.inClient,
        outDate: doc.outDate,
        outClient: doc.outClient,
        product: doc.product,
        _id: doc._id,
        imei: doc.imei,
        inPrice: doc.inPrice,
        outPrice: doc.outPrice,
        margin: doc.margin,
        marginRate: doc.marginRate,
        note: doc.note,
      };

      worksheet.addRow(newDoc);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  async getMonthSale() {
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

    return monthSale[0];
  }

  async getTodaySale() {
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

    return todaySale[0];
  }

  async getMonthTopProduct() {
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
          accOutPrice: { $sum: '$outPrice' },
          accInPrice: { $sum: '$inPrice' },
          accMargin: { $sum: { $subtract: ['$outPrice', '$inPrice'] } },
        },
      },
      {
        $sort: {
          accOutPrice: -1,
          count: -1,
        },
      },
      {
        $limit: 10,
      },
      {
        $addFields: {
          name: '$_id',
          accMarginRate: {
            $multiply: [
              {
                $divide: ['$accMargin', '$accOutPrice'],
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

    return monthTopProduct;
  }

  async getTodayTopProduct() {
    const todayTopProduct = await this.priceSaleModel.aggregate([
      {
        $match: {
          outDate: {
            $gte: Util.GetToday(),
            $lte: Util.GetTodayEnd(),
          },
        },
      },
      {
        $group: {
          _id: '$product',
          count: { $sum: 1 },
          accOutPrice: { $sum: '$outPrice' },
          accInPrice: { $sum: '$inPrice' },
          accMargin: { $sum: { $subtract: ['$inPrice', '$outPrice'] } },
        },
      },
      {
        $sort: {
          accOutPrice: -1,
          count: -1,
        },
      },
      {
        $limit: 10,
      },
      {
        $addFields: {
          name: '$_id',
          accMarginRate: {
            $multiply: [
              {
                $divide: ['$accMargin', '$accOutPrice'],
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

    return todayTopProduct;
  }

  getMonthTopClient = async () => {
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
          accMarginRate: {
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
    return monthTopClient;
  };

  getTodayTopClient = async () => {
    const todayTopClient = await this.saleModel.aggregate([
      {
        $match: {
          outDate: {
            $gte: Util.GetToday(),
            $lte: Util.GetTodayEnd(),
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
          accMarginRate: {
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
    return todayTopClient;
  };

  async getVisitClient() {
    const notVisitedOutClient = await this.clientModel
      .find({ lastOutDate: { $exists: true } })
      .sort({ lastOutDate: -1, _id: 1 })
      .limit(10);

    return notVisitedOutClient;
  }

  async reset() {
    await this.uploadRecordModel.deleteMany();
    await this.priceSaleModel.deleteMany();
    await this.saleModel.deleteMany();
    await this.clientModel.deleteMany();
  }

  async getUploadRecordList() {
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

  async deleteRecordByTime(uploadId: string) {
    await this.uploadRecordModel.deleteOne({
      _id: uploadId,
    });

    await this.saleModel.deleteMany({
      uploadId,
    });
    await this.priceSaleModel.deleteMany({
      uploadId,
    });

    await this.clientModel.deleteMany({
      uploadId: new ObjectId(uploadId),
      backupLastOutDate: { $size: 0 },
    });

    await this.clientModel.updateMany(
      {
        uploadId: new ObjectId(uploadId),
      },
      [
        {
          $set: {
            lastOutDate: { $arrayElemAt: ['$backupLastOutDate', -1] }, // 배열의 마지막 요소
          },
        },
        {
          $set: {
            uploadId: { $arrayElemAt: ['$backupUploadId', -1] }, // 배열의 마지막 요소
          },
        },
        {
          $set: {
            backupLastOutDate: {
              $slice: [
                '$backupLastOutDate',
                { $subtract: [{ $size: '$backupLastOutDate' }, 1] },
              ],
            },
          },
        },
        {
          $set: {
            backupUploadId: {
              $slice: [
                '$backupUploadId',
                { $subtract: [{ $size: '$backupUploadId' }, 1] },
              ],
            },
          },
        },
      ],
    );
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
