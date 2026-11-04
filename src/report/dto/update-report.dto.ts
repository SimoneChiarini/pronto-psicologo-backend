import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { REPORT_STATUSES } from '../report.constants';

export class UpdateReportDto {
  @IsIn(REPORT_STATUSES)
  status: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adminNote?: string;
}
