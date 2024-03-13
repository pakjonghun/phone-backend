import { BadRequestException } from '@nestjs/common';
import * as dayjs from 'dayjs';

export class Util {
  static IsDate(date: string) {
    const isValid = dayjs(date).isValid();
    return isValid;
  }

  static GetDateString(date: string) {
    const isDate = Util.IsDate(date);
    if (!isDate)
      throw new BadRequestException(`${date}는 올바른 날짜 형식이 아닙니다.`);

    return dayjs(date).format('YYYYMMDDHHmmss');
  }

  static GetMonthAgo() {
    return dayjs(new Date()).subtract(1, 'month').format('YYYYMMDDHHmmss');
  }

  static GetToday() {
    return dayjs(new Date()).startOf('day').format('YYYYMMDDHHmmss');
  }
}
