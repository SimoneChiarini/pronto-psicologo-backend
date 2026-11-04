import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { REPORT_REASONS } from '../report.constants';

export class CreateReportDto {
  @IsUUID()
  conversationId: string;

  @IsIn(Object.keys(REPORT_REASONS))
  reason: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  details?: string;
}
