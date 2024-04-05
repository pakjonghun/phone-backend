import { BadRequestException } from '@nestjs/common';
import * as dayjs from 'dayjs';

export class Util {
  static IsDate(date: string) {
    const isValid = dayjs(date).isValid();
    return isValid;
  }

  static GetDateString(date: string) {
    console.log('func', date);
    const isDate = Util.IsDate(date);
    console.log('validate result', isDate);
    if (!isDate)
      throw new BadRequestException(`${date}는 올바른 날짜 형식이 아닙니다.`);

    return dayjs(date).format('YYYYMMDDHHmmss');
  }

  static GetMonthAgo() {
    return dayjs(new Date()).startOf('month').format('YYYYMMDDHHmmss');
  }

  static GetToday() {
    return dayjs(new Date()).startOf('day').format('YYYYMMDDHHmmss');
  }

  static GetTodayEnd() {
    return dayjs(new Date()).endOf('day').format('YYYYMMDDHHmmss');
  }

  static IsNumber(number: unknown) {
    if (number == null) return false;
    if (typeof number === 'string' && number.trim() == '') return false;

    return !isNaN(Number(number));
  }

  static YearAgo() {
    return dayjs().subtract(1, 'year').format('YYYYMMDDHHmmss');
  }

  static DecadeAgo() {
    return dayjs().subtract(12, 'year').format('YYYYMMDDHHmmss');
  }

  static MonthAfter() {
    return dayjs().add(1, 'month').format('YYYYMMDDHHmmss');
  }

  static DecadeAfter() {
    return dayjs().add(12, 'year').format('YYYYMMDDHHmmss');
  }

  static GetMonthRange(date: string) {
    const from = dayjs(date).startOf('month').format('YYYYMMDDHHmmss');
    const to = dayjs(date).endOf('month').format('YYYYMMDDHHmmss');
    return { from, to };
  }
}
