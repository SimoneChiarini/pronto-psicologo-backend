import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { REPORT_REASONS } from '../report.constants';

/** Segnalazione di un messaggio in un gruppo dell'area professionisti. */
export class CaseMessageReportDto {
  @IsIn(Object.keys(REPORT_REASONS))
  reason: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  details?: string;
}

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
