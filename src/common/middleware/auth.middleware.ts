import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request, Response } from 'express';

@Injectable()
export class SetUserInfoMiddleware implements NestMiddleware {
  private logger = new Logger('middleware');
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  use(req: Request, res: Response, next: (error?: any) => void) {
    try {
      const accessToken = req.cookies['userInfo'] ?? req.headers.cookie;
      if (accessToken) {
        const jwtSecret = this.configService.get('JWT_SECRET');
        const userInfo = this.jwtService.verify(accessToken, {
          secret: jwtSecret,
        });
        req['userInfo'] = userInfo;
      }
    } catch (err) {
      res.cookie('userInfo', '', { expires: new Date(0) });
      res.clearCookie('userInfo');

      this.logger.error('user token error');
    }

    next();
  }
}
