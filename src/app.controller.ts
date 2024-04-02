import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
import { CommonDownloadDTO } from './dto/download.sale.dto';
import { EditDashboardDTO } from './dto/edit.dashboard.dto';
import { EditClientDTO } from './dto/edit.client.dto';
import { ClientListDTO } from './dto/client.list.dto';
import { Page } from './dto/page.dto';
import { DashboardMonthDTO } from './dto/dashboard.month.dto';

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

  @Get('/sale')
  async saleList(@Query() query: SaleListDTO) {
    const result = await this.appService.saleList(query);
    return result;
  }

  @Delete('reset')
  async reset() {
    await this.appService.reset();
  }

  @Get('/sale/download')
  async downloadSale(@Query() query: CommonDownloadDTO) {
    return this.appService.downloadSale(query.idList);
  }

  @Put('/dashboard/note/:id')
  async editDashboardNote(
    @Param('id') param: string,
    @Body() body: EditDashboardDTO,
  ) {
    this.appService.editDashboard(param, body);
  }

  @Get('/upload/record')
  async uploadRecordList() {
    const result = await this.appService.getUploadRecordList();
    return result;
  }

  @Delete('/upload/delete')
  async deleteRecordByTime(@Body('uploadId') uploadId: string) {
    await this.appService.deleteRecordByTime(uploadId);
  }

  @Get('/dashboard/month-sale')
  async getMonthSale(@Query() date: DashboardMonthDTO) {
    const result = await this.appService.getMonthSale(date);
    return result;
  }

  @Get('/dashboard/today-sale')
  async getTodaySale() {
    const result = await this.appService.getTodaySale();
    return result;
  }

  @Get('/dashboard/month-product')
  async getMonthTopProduct(@Query() date: DashboardMonthDTO) {
    const result = await this.appService.getMonthTopProduct(date);
    return result;
  }
  @Get('/dashboard/today-product')
  async getTodayTopProduct() {
    const result = await this.appService.getTodayTopProduct();
    return result;
  }

  @Get('/dashboard/month-client')
  async getMonthTopClient(@Query() date: DashboardMonthDTO) {
    const result = await this.appService.getMonthTopClient(date);
    return result;
  }

  @Get('/dashboard/today-client')
  async getTodayTopClient() {
    const result = await this.appService.getTodayTopClient();
    return result;
  }

  @Get('/dashboard/visit-client')
  async getVisitClient(@Query() pageParam: Page) {
    const result = await this.appService.getVisitClient(pageParam);
    return result;
  }

  @Put('/sale-client')
  async editSaleClient(@Body() { id, ...body }: EditClientDTO) {
    await this.appService.editSaleClient({ _id: id }, body);
  }

  @Get('/sale-client')
  async saleClientList(@Query() query: ClientListDTO) {
    const result = await this.appService.saleClientList(query);
    return result;
  }
}
