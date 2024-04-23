import { IsOptional } from 'class-validator';
import { Page } from './page.dto';
import { CustomValid } from 'src/common/validation/isKeyof.validation';
import { isDayjsDate } from 'src/common/validation/isDayjsDate';

export class DatePageDTO extends Page {
  @IsOptional()
  @CustomValid(isDayjsDate)
  date: string;
}
