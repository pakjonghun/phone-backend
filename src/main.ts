import * as cookieParser from 'cookie-parser';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BadRequestException, ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.WHITE_URL,
    credentials: true,
  });

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      transform: true,
      exceptionFactory(errors) {
        const messages = errors.map((error) => {
          const constraints = error.constraints;
          console.log(constraints);
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
