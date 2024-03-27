import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Put,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import { LoginDTO } from './dto/login.dto';
import { AuthType } from 'src/common/decorator/auth.decorator';
import { AUTH_TYPE } from 'src/common/guard/auth.guard';
import { SignupDTO } from './dto/signup.dto.ts';
import { UserService } from './user.service';
import { SaveCookieInterceptor } from 'src/common/interceptor/cookie.interceptor';
import { getUserInfoDecorator } from 'src/common/decorator/getUser.decorator';
import { PasswordChangeDTO } from './dto/passwordChange.dto';
import { RoleChangeDTO } from './dto/roleChange.dto';
import { Role } from 'src/scheme/user.scheme';
import { Response } from 'express';
import { LogoutInterceptor } from 'src/common/interceptor/logout.interceptor';
import { SetLog } from 'src/common/decorator/log.decorator';

@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}

  @SetLog('로그인')
  @UseInterceptors(SaveCookieInterceptor)
  @Post('login')
  async login(@Body() user: LoginDTO) {
    const result = await this.userService.login(user);
    return result;
  }

  @SetLog('회원가입')
  // @AuthType(AUTH_TYPE.ADMIN)
  @Post('signup/:id')
  async signup(@Body() user: SignupDTO) {
    await this.userService.signup(user);
  }

  @AuthType(AUTH_TYPE.ANY)
  @Get('me')
  async me(
    @getUserInfoDecorator() user: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    new Logger('me').debug(user);
    if (user) {
      return { id: user.id, role: user.role };
    } else {
      res.cookie('userInfo', '', { expires: new Date(0) });
      res.clearCookie('userInfo');
      throw new BadRequestException('token is inValid');
    }
  }

  @SetLog('비밀번호 변경')
  @AuthType(AUTH_TYPE.ADMIN)
  @Put('password/:id')
  async changePassword(
    @Param('id') id: string,
    @Body() changePasswordBody: PasswordChangeDTO,
  ) {
    await this.userService.changePassword(id, changePasswordBody);
  }

  @AuthType(AUTH_TYPE.ADMIN)
  @Get()
  async userList(@getUserInfoDecorator() user: any) {
    const userList = await this.userService.userList();
    return userList.filter((item) => item._id !== user.id);
  }

  @SetLog('권한변경')
  @AuthType(AUTH_TYPE.ADMIN)
  @Put('role/:id')
  async changeRole(
    @Param('id') id: string,
    @Body() roleChangeBody: RoleChangeDTO,
  ) {
    await this.userService.changeRole(id, roleChangeBody);
  }

  @SetLog('로그아웃')
  @AuthType(AUTH_TYPE.ANY)
  @UseInterceptors(LogoutInterceptor)
  @Get('logout')
  async logout() {
    // res.cookie('userInfo', '', { maxAge: 0 });
  }

  @AuthType(AUTH_TYPE.ADMIN)
  @Get('role')
  async roleList() {
    const roleList: { name: Role; description: string }[] = [
      { name: 'ADMIN', description: '마스터 권한' },
      { name: 'MANAGER', description: '데이터 생성, 조회, 수정 삭제 권한' },
      { name: 'STAFF', description: '백 데이터 입력, 조회 권한' },
    ];
    return roleList;
  }

  @SetLog('계정삭제')
  @AuthType(AUTH_TYPE.ADMIN)
  @Delete(':id')
  async deleteUser(@Param('id') id: string) {
    await this.userService.deleteUser(id);
  }
}
