import { BadRequestException } from '@nestjs/common';
import * as dayjs from 'dayjs';

export class Util {
  static IsDate(date: string) {
    console.dir(date, { depth: 10 });
    const isValid = dayjs(date).isValid();
    return isValid;
  }

  static GetDateString(date: string, errorMsg?: string) {
    if (typeof date === 'object' && (date as unknown) instanceof Date) {
      date = dayjs(date).format('YYYY-MM-DD');
    }

    const isDate = Util.IsDate(date);
    if (!isDate)
      throw new BadRequestException(
        errorMsg ?? `${date}는 올바른 날짜 형식이 아닙니다.`,
      );

    return dayjs(date).format('YYYYMMDDHHmmss');
  }

  static ValidDateFormat(date: string) {
    const dateReg = /^\d{4}-\d{1,2}-\d{1,2}$/;
    return dateReg.test(date.trim());
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
