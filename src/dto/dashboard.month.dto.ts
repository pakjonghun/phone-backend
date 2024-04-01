import { IsOptional } from 'class-validator';
import { isDayjsDate } from 'src/common/validation/isDayjsDate';
import { CustomValid } from 'src/common/validation/isKeyof.validation';

export class DashboardMonthDTO {
  @IsOptional()
  @CustomValid(isDayjsDate)
  date?: string;
}
