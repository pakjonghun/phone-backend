import {
  Body,
  Controller,
  Get,
  ParseFilePipe,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { AppService } from './app.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { storage } from 'src/common/helper/file.helper';
import {
  FileSizeValidator,
  FileTypeValidator,
} from './common/validation/file.validation';
import {
  ALLOW_EXCEL_FILE_TYPE_LIST,
  EXCEL_FILE_SIZE_LIMIT,
} from './common/constant';
import { SaleListDTO } from './dto/sale.list.dto';
import { ConfirmSaleListDTO } from './dto/confirm.sale.dto';
import { DownloadSaleDTO } from './dto/download.sale.dto';
import { PurchaseListDTO } from './dto/purchase.list.dto';
// import { SaleListDTO } from './dto/saleList.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('sale/upload')
  @UseInterceptors(FileInterceptor('file', { storage }))
  async uploadSale(
    @UploadedFile(
      new ParseFilePipe({
        errorHttpStatusCode: 400,
        validators: [
          new FileSizeValidator({ size: EXCEL_FILE_SIZE_LIMIT }),
          new FileTypeValidator({ allowType: ALLOW_EXCEL_FILE_TYPE_LIST }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    await this.appService.uploadSale(file);
  }

  @Post('purchase/upload')
  @UseInterceptors(FileInterceptor('file', { storage }))
  async uploadPurchase(
    @UploadedFile(
      new ParseFilePipe({
        errorHttpStatusCode: 400,
        validators: [
          new FileSizeValidator({ size: EXCEL_FILE_SIZE_LIMIT }),
          new FileTypeValidator({ allowType: ALLOW_EXCEL_FILE_TYPE_LIST }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    await this.appService.uploadPurchase(file);
  }

  @Get('/sale')
  async saleList(@Query() query: SaleListDTO) {
    const result = await this.appService.saleList(query);
    return result;
  }

  @Get('/purchase')
  async purchaseList(@Query() query: PurchaseListDTO) {
    const result = await this.appService.purchaseList(query);
    return result;
  }

  @Put('/sale')
  async saleConfirm(@Body() body: ConfirmSaleListDTO) {
    await this.appService.confirmSale(body.idList);
  }

  @Get('/sale/apply')
  async applySale() {
    await this.appService.calculateProduct();
  }

  @Get('/sale/download')
  async downloadSale(@Query() query: DownloadSaleDTO) {
    return this.appService.downloadSale(query.idList);
  }
}
