import { IsDateString, IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class RequestSlotDto {
  @IsString() @IsNotEmpty()
  psychologistId: string;

  @IsDateString()
  startTime: string;

  @IsOptional() @IsString()
  notes?: string;
}
