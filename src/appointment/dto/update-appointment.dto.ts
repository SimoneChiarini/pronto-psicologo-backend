import { IsOptional, IsString } from 'class-validator';

export class UpdateAppointmentDto {
  @IsOptional() @IsString()
  title?: string;

  @IsOptional() @IsString()
  notes?: string;

  @IsOptional() @IsString()
  startTime?: string;

  @IsOptional() @IsString()
  endTime?: string;

  @IsOptional() @IsString()
  status?: string;
}
