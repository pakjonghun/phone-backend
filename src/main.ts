import * as cookieParser from 'cookie-parser';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { FallbackFilter } from './common/exception/filter/fallback.filter';
import { HttpFilter } from './common/exception/filter/http.filter';
import { ValidateFilter } from './common/exception/filter/validation.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.WHITE_URL,
    credentials: true,
  });

  app.use(cookieParser());
  app.useGlobalFilters(
    new FallbackFilter(),
    new HttpFilter(),
    new ValidateFilter(),
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      transform: true,
      exceptionFactory(errors) {
        const messages = errors.map((error) => {
          const property = error.property;
          const value = error.value;

          return `${property}의 값 ${value}는 잘못된 값입니다.`;
        });

        return new BadRequestException(messages);
      },
    }),
  );
  await app.listen(process.env.PORT);
}
bootstrap();
