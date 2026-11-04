import { IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional() @IsNumber() @Min(1) @Max(1000)
  radiusKm?: number;

  @IsOptional() @IsInt() @Min(1) @Max(10080)
  expandMinutes?: number;

  @IsOptional() @IsInt() @Min(1) @Max(100)
  maxAnswers?: number;

  // Max membri per gruppo di intervisione/supervisione; 0 = nessun limite
  @IsOptional() @IsInt() @Min(0) @Max(1000)
  maxGroupMembers?: number;
}
