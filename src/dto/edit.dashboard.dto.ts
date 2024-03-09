import { IsString } from 'class-validator';

export class EditDashboardDTO {
  @IsString()
  note: string;
}
