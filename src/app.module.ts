import { MiddlewareConsumer, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import * as joi from 'joi';
import { SetUserInfoMiddleware } from 'src/common/middleware/auth.middleware';
import { Client, ClientScheme } from 'src/scheme/client.scheme';
import { Product, ProductSCheme } from 'src/scheme/product.scheme';
import { Purchase, PurchaseScheme } from 'src/scheme/purchase.scheme';
import { Sale, SaleScheme } from 'src/scheme/sale.scheme';
import { JwtModule } from '@nestjs/jwt';
import { UserModule } from './user/user.module';
import {
  purchaseExcelMapper,
  saleDownloadMapper,
  saleExcelMapper,
  saleRank,
  saleRankReverse,
} from './constant';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { LoggingInterceptor } from './common/interceptor/log.interceptor';
import { ResponseInterceptor } from './common/interceptor/response.interceptor';
import { AuthGuard } from './common/guard/auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
      validationSchema: joi.object({
        PORT: joi.number().required(),
        MONGO_DB_URL: joi.string().required(),
        MONGO_DB_NAME: joi.string().required(),
        WHITE_URL: joi.string().required(),
        JWT_SECRET: joi.string().required(),
        COOKIE_DOMAIN: joi.string().required(),
      }),
    }),
    JwtModule,
    MongooseModule.forRoot(process.env.MONGO_DB_URL, {
      dbName: process.env.MONGO_DB_NAME,
    }),
    MongooseModule.forFeature([
      { name: Client.name, schema: ClientScheme },
      { name: Product.name, schema: ProductSCheme },
      { name: Purchase.name, schema: PurchaseScheme },
      { name: Sale.name, schema: SaleScheme },
    ]),
    UserModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    AppService,
    {
      provide: 'saleExcelMapper',
      useValue: saleExcelMapper,
    },
    {
      provide: 'purchaseExcelMapper',
      useValue: purchaseExcelMapper,
    },
    {
      provide: 'saleRank',
      useValue: saleRank,
    },
    {
      provide: 'saleDownloadMapper',
      useValue: saleDownloadMapper,
    },
    {
      provide: 'saleRankReverse',
      useValue: saleRankReverse,
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SetUserInfoMiddleware).forRoutes('*');
  }
}
