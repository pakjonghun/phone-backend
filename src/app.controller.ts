import {
  Body,
  Controller,
  Delete,
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
import { CommonMultiUpdateDTO } from './dto/confirm.sale.dto';
import { CommonDownloadDTO } from './dto/download.sale.dto';
import { PurchaseListDTO } from './dto/purchase.list.dto';
import { MarginListDTO } from './dto/margin.list.dto';
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
  async saleConfirm(@Body() body: CommonMultiUpdateDTO) {
    await this.appService.confirmSale(body.idList);
  }

  @Put('/purchase')
  async purchaseConfirm(@Body() body: CommonMultiUpdateDTO) {
    await this.appService.confirmPurchase(body.idList);
  }

  @Get('/sale/apply')
  async applySale() {
    await this.appService.calculateProduct();
  }

  @Get('/purchase/apply')
  async applyPurchase() {
    await this.appService.calculateProductByPurchase();
  }

  @Get('/purchase/download')
  async downloadPurchase(@Query() query: CommonDownloadDTO) {
    return this.appService.downloadPurchase(query.idList);
  }

  @Get('/dashboard')
  async dashboard() {
    return this.appService.dashboardData();
  }

  @Delete('reset')
  async reset() {
    await this.appService.reset();
  }

  @Get('margin')
  async margin(@Query() query: MarginListDTO) {
    const result = await this.appService.minusMargin(query);
    return result;
  }

  @Get('/sale/download')
  async downloadSale(@Query() query: CommonDownloadDTO) {
    return this.appService.downloadSale(query.idList);
  }
}
