import { BadRequestException, Injectable } from '@nestjs/common';
import mongoose, { ClientSession, Model } from 'mongoose';
import { Column } from 'src/common/type';
import * as ExcelJS from 'exceljs';
import { getNowDate } from '../utils';

@Injectable()
export abstract class BackDataService {
  constructor(
    protected model: Model<any>,
    protected lengthNameMapper: Record<number, keyof any>,
    protected downloadColumns: Column<string>[],
  ) {}

  async upload(uploadFile: Express.Multer.File) {
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

        const newModel = new this.model();

        const columnArray = Array.from(
          { length: row.cellCount },
          (_, k) => k + 1,
        );

        for await (const length of columnArray) {
          const cell = row.getCell(length);
          const value = cell.value;
          if (value == null) continue;

          const fieldName = this.lengthNameMapper[length];
          newModel[fieldName as string] = value;
        }

        await newModel.validate();

        newDocument.push(newModel);
      }

      break;
    }

    await this.bulkWrite(newDocument);
  }

  async findMany({
    keyword = '',
    limit = 10,
    skip = 0,
    keywordTarget = 'name',
    sortTarget = 'updatedAt',
    order = -1,
  }: any) {
    const filter = this.getFilter(keyword, keywordTarget);
    const totalCount = await this.model.countDocuments(filter);
    const hasNext = totalCount > (skip + 1) * limit;
    const data = await this.model
      .find(filter)
      .select(['-updatedAt'])
      .sort({ [sortTarget]: order, _id: -1 })
      .skip(skip * limit)
      .limit(limit);

    return {
      data,
      totalCount,
      hasNext,
    };
  }

  protected throwCommonBadRequest(target: string) {
    throw new BadRequestException(`${target}는 올바르지 않은 값입니다.`);
  }

  protected getFilter(keyword: any, keywordTarget: any) {
    const isEmptyString = typeof keyword === 'string' && keyword.trim() == '';
    if (keyword == null || isEmptyString) return {};
    const fieldType = this.model.schema.path(keywordTarget).instance;

    let filter: mongoose.FilterQuery<Location> = {};
    switch (fieldType) {
      case 'Number':
        filter = { [keywordTarget]: keyword ? Number(keyword) : 0 };
        break;
      case 'Boolean':
      case 'Date':
        filter = { [keywordTarget]: keyword };
        break;
      case 'String':
        filter = { [keywordTarget]: { $regex: keyword, $options: 'i' } };
        break;
      default:
        this.throwCommonBadRequest(keyword);
        break;
    }

    return filter;
  }

  protected async bulkWrite(documents: any[]) {
    const session: ClientSession = await this.model.db.startSession();
    session.startTransaction();
    try {
      await this.model.bulkWrite(
        documents.map((document) => {
          document.updatedAt = getNowDate();
          return {
            insertOne: {
              document,
            },
          };
        }),
        { session },
      );
      await session.commitTransaction();
    } catch (err) {
      console.log('err??', err);
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }
}
