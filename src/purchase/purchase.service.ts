import { ObjectId } from 'mongodb';
import * as fs from 'fs';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { Util } from '../common/helper/service.helper';
import * as ExcelJS from 'exceljs';
import { promisify } from 'util';
import * as dayjs from 'dayjs';
import { EditDashboardDTO } from '../dto/edit.dashboard.dto';
import { UploadRecord } from '../scheme/upload.record';
import { Purchase } from 'src/scheme/purchase.scheme';
import { PurchaseDownloadMapper, PurchaseExcelMapper } from './constant';
import { PurchaseClient } from 'src/scheme/purchase.client.scheme';
import { PurchaseListDTO } from './dto/purchase.list.dto';

@Injectable()
export class PurchaseService {
  constructor(
    @InjectModel(Purchase.name) private purchaseModel: Model<Purchase>,
    @InjectModel(PurchaseClient.name)
    private purchaseClientModel: Model<PurchaseClient>,
    @InjectModel(UploadRecord.name)
    private uploadRecordModel: Model<UploadRecord>,
    @Inject('purchaseExcelMapper')
    private purchaseExcelMapper: PurchaseExcelMapper,
    @Inject('purchaseDownloadMapper')
    private purchaseDownloadMapper: PurchaseDownloadMapper,
  ) {}

  async uploadPurchase(uploadFile: Express.Multer.File) {
    const recordDoc = new this.uploadRecordModel();
    await recordDoc.save();

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

          if (fieldName === 'imei') {
            if (!value) {
              throw new BadRequestException(
                `엑셀 파일에 ${cell.$col$row}위치에 IMEI를 입력해주세요.`,
              );
            }
          }

          newPurchase[fieldName as string] = value;

          const isExist = newPurchase.schema.path(fieldName);
          if (isExist) newPurchase[fieldName] = value;
          const isValid = newPurchase.$isValid(fieldName);

          if (!isValid) {
            throw new BadRequestException(
              `엑셀 파일에 ${cell.$col$row}위치의 ${fieldName}의 값인 ${value}은 잘못된 형식의 값 입니다. ${target.instance}타입의 값으로 바꾸어 주세요`,
            );
          }
        }

        newPurchase.uploadId = recordDoc._id as string;
        await newPurchase.validate();
        const obj = newPurchase.toObject();
        newDocument.push(obj);

        const inDate = newPurchase.inDate as string;
        const inClient = newPurchase.inClient as unknown as string;
        const existInDate = clientMap.get(inClient);
        if (!existInDate) {
          clientMap.set(inClient, inDate);
        }

        if (existInDate) {
          const isInDateLatest = dayjs(inDate).isAfter(dayjs(existInDate));
          if (isInDateLatest) {
            clientMap.set(inClient, inDate);
          }
        }
      }

      if (newDocument.length === 0) {
        throw new BadRequestException('입력 가능한 데이터가 없습니다.');
      }

      const clientIds = Array.from(clientMap).map(([clientId]) => clientId);
      const existClients = await this.purchaseClientModel.find({
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
          new this.purchaseClientModel({
            _id,
            lastOutDate,
            uploadId: recordDoc._id as mongoose.Types.ObjectId,
            backupLastOutDate: [],
          }),
      );

      await this.purchaseClientModel.insertMany(insertClientList);
      await this.purchaseClientModel.bulkWrite(
        Array.from(existClientList).map(([clientId, lastInDate]) => ({
          updateOne: {
            filter: { _id: clientId, lastInDate: { $lt: lastInDate } },
            update: [
              {
                $set: {
                  backupLastOutDate: {
                    $concatArrays: ['$backupLastInDate', ['$lastInDate']],
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
                  lastInDate,
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

      const duplicatedItems = await this.purchaseModel.find({
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

      await this.purchaseModel.bulkWrite(
        newDocument.map((document) => ({
          insertOne: { document },
        })),
      );

      break;
    }

    await this.unlinkExcelFile(uploadFile.path);
  }

  async purchaseList({
    keyword = '',
    length,
    page,
    sort = [['updatedAt', -1]],
    startDate,
    endDate,
  }: PurchaseListDTO) {
    const filter = {
      product: {
        $regex: keyword,
        $options: 'i',
      },
      inDate: {
        $gte: startDate
          ? dayjs(startDate).format('YYYYMMDDHHmmss')
          : Util.YearAgo(),
        $lte: endDate
          ? dayjs(endDate).format('YYYYMMDDHHmmss')
          : Util.MonthAfter(),
      },
    };
    const totalCount = await this.purchaseModel.countDocuments(filter);
    const hasNext = totalCount > page * length;
    const parseSort = sort.map(([sortKey, sortValue]) => [
      sortKey,
      Number(sortValue),
    ]);
    const sortObj = Object.fromEntries(parseSort);
    const data = await this.purchaseModel
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

  async download(idList: string[]) {
    const promises = idList.map((item) => {
      const split = item.split('_');
      const imei = split[0];
      const inDate = split[1];
      return this.purchaseModel.findOne({ imei, inDate });
    });

    const stream = await Promise.all(promises);

    // const stream = await this.saleModel.find({ _id: { $in: idList } });
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('판매시트');

    worksheet.columns = this.purchaseDownloadMapper;

    for await (const doc of stream) {
      const newDoc = {
        inDate: doc.inDate,
        inClient: doc.inClient,
        product: doc.product,
        _id: doc._id,
        imei: doc.imei,
        inPrice: doc.inPrice,
        note: doc.note,
      };

      worksheet.addRow(newDoc);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  async getMonthPurchase() {
    const monthSale = await this.purchaseModel.aggregate([
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
          accInPrice: { $sum: '$inPrice' },
        },
      },
    ]);

    return monthSale[0];
  }

  async getTodayPurchase() {
    const todaySale = await this.purchaseModel.aggregate([
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
          accInPrice: { $sum: '$inPrice' },
        },
      },
    ]);

    return todaySale[0];
  }

  async getMonthTopProduct() {
    const monthTopProduct = await this.purchaseModel.aggregate([
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
          accInPrice: { $sum: '$inPrice' },
        },
      },
      {
        $sort: {
          accInPrice: -1,
          count: -1,
        },
      },
      {
        $limit: 10,
      },
      {
        $addFields: {
          name: '$_id',
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
    const todayTopProduct = await this.purchaseModel.aggregate([
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
          accInPrice: { $sum: '$inPrice' },
        },
      },
      {
        $sort: {
          accInPrice: -1,
          count: -1,
        },
      },
      {
        $limit: 10,
      },
      {
        $addFields: {
          name: '$_id',
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
    const monthTopClient = await this.purchaseModel.aggregate([
      {
        $match: {
          outDate: {
            $gte: Util.GetMonthAgo(),
          },
        },
      },
      {
        $group: {
          _id: '$inClient',
          count: { $sum: 1 },
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
    const todayTopClient = await this.purchaseModel.aggregate([
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
          _id: '$inClient',
          count: { $sum: 1 },
          accInPrice: { $sum: '$inPrice' },
        },
      },
      {
        $sort: {
          accInPrice: -1,
          count: -1,
        },
      },
      {
        $limit: 10,
      },

      {
        $addFields: {
          name: '$_id',
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
    const notVisitedOutClient = await this.purchaseClientModel
      .find({ lastInDate: { $exists: true } })
      .sort({ lastInDate: 1, _id: 1 })
      .limit(10)
      .lean();

    const clientIds = notVisitedOutClient.map((item) => item._id);

    const clientSales = await this.purchaseModel.aggregate([
      {
        $match: {
          outClient: { $in: clientIds },
          outDate: { $gt: Util.GetMonthAgo() },
        },
      },
      {
        $group: {
          _id: '$inClient',
          accInPrice: { $sum: '$inPrice' },
        },
      },
    ]);
    const result = notVisitedOutClient.map((item) => {
      const targetSale = clientSales.find((jtem) => jtem._id === item._id);
      const newItem = {
        ...item,
        accOutPrice: targetSale.accOutPrice ?? 0,
        accMargin: targetSale.accMargin ?? 0,
        marginRate: targetSale.marginRate ?? 0,
      };
      return newItem;
    });

    return result;
  }

  async reset() {
    await this.uploadRecordModel.deleteMany();
    await this.purchaseClientModel.deleteMany();
    await this.purchaseModel.deleteMany();
  }

  async getUploadRecordList() {
    return this.uploadRecordModel.find({});
  }

  async editDashboard(id: string, { note }: EditDashboardDTO) {
    const result = await this.purchaseClientModel.updateOne(
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

    await this.purchaseModel.deleteMany({
      uploadId,
    });

    await this.purchaseClientModel.deleteMany({
      uploadId: new ObjectId(uploadId),
      backupLastInDate: { $size: 0 },
    });

    await this.purchaseClientModel.updateMany(
      {
        uploadId: new ObjectId(uploadId),
      },
      [
        {
          $set: {
            lastOutDate: { $arrayElemAt: ['$backupLastInDate', -1] }, // 배열의 마지막 요소
          },
        },
        {
          $set: {
            uploadId: { $arrayElemAt: ['$backupUploadId', -1] }, // 배열의 마지막 요소
          },
        },
        {
          $set: {
            backupLastInDate: {
              $slice: [
                '$backupLastInDate',
                { $subtract: [{ $size: '$backupLastInDate' }, 1] },
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

  private async unlinkExcelFile(filePath: string) {
    const unlinkAsync = promisify(fs.unlink);
    await unlinkAsync(filePath);
  }
}
