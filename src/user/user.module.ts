import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserScheme } from 'src/scheme/user.scheme';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  exports: [UserService],
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        global: true,
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' }, // 예시로 7일 설정
      }),
    }),
    MongooseModule.forFeature([{ name: User.name, schema: UserScheme }]),
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
