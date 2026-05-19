import { IsBoolean, IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAppointmentDto {
  @IsString() @IsNotEmpty()
  title: string;

  @IsOptional() @IsString()
  notes?: string;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  @IsOptional() @IsBoolean()
  isExternal?: boolean;

  @IsOptional() @IsString()
  externalClientName?: string;

  @IsOptional() @IsString()
  userId?: string;
}
