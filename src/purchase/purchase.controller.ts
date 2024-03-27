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
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ALLOW_EXCEL_FILE_TYPE_LIST,
  EXCEL_FILE_SIZE_LIMIT,
} from 'src/common/constant';
import { storage } from 'src/common/helper/file.helper';
import {
  FileSizeValidator,
  FileTypeValidator,
} from 'src/common/validation/file.validation';
import { PurchaseService } from './purchase.service';
import { CommonDownloadDTO } from 'src/dto/download.sale.dto';
import { EditDashboardDTO } from 'src/dto/edit.dashboard.dto';
import { PurchaseListDTO } from './dto/purchase.list.dto';
import { EditClientDTO } from 'src/dto/edit.client.dto';
import { ClientListDTO } from 'src/dto/client.list.dto';

@Controller('purchase')
export class PurchaseController {
  constructor(private readonly purchaseService: PurchaseService) {}

  @Post('upload')
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
    await this.purchaseService.uploadPurchase(file);
  }

  @Get('')
  async purchaseList(@Query() query: PurchaseListDTO) {
    const result = await this.purchaseService.purchaseList(query);
    return result;
  }

  @Get('download')
  async downloadPurchase(@Query() query: CommonDownloadDTO) {
    return this.purchaseService.download(query.idList);
  }

  @Get('/upload/record')
  async uploadRecordList() {
    const result = await this.purchaseService.getUploadRecordList();
    return result;
  }

  @Delete('/upload/delete')
  async deleteRecordByTime(@Body('uploadId') uploadId: string) {
    await this.purchaseService.deleteRecordByTime(uploadId);
  }

  @Put('/dashboard/note/:id')
  async editDashboardNote(
    @Param('id') param: string,
    @Body() body: EditDashboardDTO,
  ) {
    this.purchaseService.editDashboard(param, body);
  }

  @Get('/dashboard/month-purchase')
  async getMonthPurchase() {
    const result = await this.purchaseService.getMonthPurchase();
    return result;
  }

  @Get('/dashboard/today-purchase')
  async getTodayPurchase() {
    const result = await this.purchaseService.getTodayPurchase();
    return result;
  }

  @Get('/dashboard/month-product')
  async getMonthTopProduct() {
    const result = await this.purchaseService.getMonthTopProduct();
    return result;
  }
  @Get('/dashboard/today-product')
  async getTodayTopProduct() {
    const result = await this.purchaseService.getTodayTopProduct();
    return result;
  }

  @Get('/dashboard/month-client')
  async getMonthTopClient() {
    const result = await this.purchaseService.getMonthTopClient();
    return result;
  }

  @Get('/dashboard/today-client')
  async getTodayTopClient() {
    const result = await this.purchaseService.getTodayTopClient();
    return result;
  }

  @Get('/dashboard/visit-client')
  async getVisitClient() {
    const result = await this.purchaseService.getVisitClient();
    return result;
  }

  @Put('')
  async editSaleClient({ id, ...body }: EditClientDTO) {
    await this.purchaseService.editPurchaseClient({ _id: id }, body);
  }

  @Get('/client')
  async saleClientList(@Query() query: ClientListDTO) {
    const result = await this.purchaseService.purchaseClientList(query);
    return result;
  }
}
