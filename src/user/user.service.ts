import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SignupDTO } from './dto/signup.dto.ts';
import { LoginDTO } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PasswordChangeDTO } from './dto/passwordChange.dto';
import { RoleChangeDTO } from './dto/roleChange.dto';
import { User } from 'src/scheme/user.scheme';

@Injectable()
export class UserService {
  private saltOrRounds = 10;

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private jwtService: JwtService,
  ) {}

  async signup({ id, password, role }: SignupDTO) {
    const existUser = await this.findUserById(id);
    if (existUser) {
      throw new BadRequestException('id is already exist');
    }

    const hashPassword = await bcrypt.hash(password, this.saltOrRounds);
    await this.userModel.create({ _id: id, password: hashPassword, role });
  }

  async login({ id, password }: LoginDTO) {
    const existUser = await this.findUserById(id);

    if (!existUser) {
      throw new BadRequestException('id is not exist');
    }

    const isMatch = await bcrypt.compare(password, existUser.password);

    if (!isMatch) {
      throw new BadRequestException('password is not match');
    }

    const payload = {
      id,
      role: existUser.role,
    };
    const token = await this.jwtService.signAsync(payload);
    return { token, payload };
  }

  async findUserById(id: string) {
    return this.userModel.findOne({ _id: id });
  }

  async userList() {
    return this.userModel.find({}, { password: 0 }).sort({ createdAt: -1 });
  }

  async changePassword(id, { password }: PasswordChangeDTO) {
    const existUser = await this.checkUserExist(id);

    const hashPassword = await bcrypt.hash(password, this.saltOrRounds);
    existUser.password = hashPassword;
    await existUser.save();
  }

  async changeRole(id, { role }: RoleChangeDTO) {
    const existUser = await this.checkUserExist(id);
    existUser.role = role;
    await existUser.save();
  }

  async deleteUser(id: string) {
    await this.checkUserExist(id);
    await this.userModel.deleteOne({ _id: id });
  }

  async checkUserExist(userId: string) {
    const existUser = await this.findUserById(userId);
    if (!existUser) {
      throw new BadRequestException('no user');
    }

    return existUser;
  }
}
