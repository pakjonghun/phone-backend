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

@Controller('purchase')
export class PurchaseController {
  constructor(private readonly purchaseService: PurchaseService) {}

  @Post('purchase/upload')
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
    await this.purchaseService.uploadPurchase(file);
  }

  @Get('/purchase')
  async saleList(@Query() query: PurchaseListDTO) {
    const result = await this.purchaseService.purchaseList(query);
    return result;
  }

  @Get('/sale/download')
  async downloadSale(@Query() query: CommonDownloadDTO) {
    return this.purchaseService.download(query.idList);
  }

  @Put('/dashboard/purchase/note/:id')
  async editDashboardNote(
    @Param('id') param: string,
    @Body() body: EditDashboardDTO,
  ) {
    this.purchaseService.editDashboard(param, body);
  }

  @Get('/upload/purchase/record')
  async uploadRecordList() {
    const result = await this.purchaseService.getUploadRecordList();
    return result;
  }

  @Delete('/upload/purchase/delete')
  async deleteRecordByTime(@Body('uploadId') uploadId: string) {
    await this.purchaseService.deleteRecordByTime(uploadId);
  }
}
