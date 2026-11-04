import {
  ArrayMaxSize, Equals, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength,
} from 'class-validator';

export class UpsertSupervisorProfileDto {
  @IsBoolean()
  active: boolean;

  @IsOptional() @IsString() @MaxLength(2000)
  bio?: string;

  @IsOptional() @IsString() @MaxLength(120)
  orientation?: string;

  @IsOptional() @IsInt() @Min(0) @Max(70)
  yearsExperience?: number;

  // Importi in centesimi. Minimo 5 € (sotto, la commissione Stripe mangia quasi tutto)
  @IsInt() @Min(500) @Max(100000)
  priceIndividualCents: number;

  @IsInt() @Min(500) @Max(100000)
  pricePerParticipantCents: number;
}

export class CreateSupervisionDto {
  @IsUUID()
  supervisorId: string;

  @IsIn(['INDIVIDUAL', 'GROUP'])
  mode: string;

  @IsString() @MinLength(3) @MaxLength(160)
  title: string;

  @IsString() @MinLength(20) @MaxLength(5000)
  caseSummary: string;

  // Solo per mode GROUP: colleghi invitati a partecipare (pagano ciascuno la propria quota)
  @IsOptional() @IsArray() @ArrayMaxSize(50) @IsUUID('all', { each: true })
  colleagueIds?: string[];

  @Equals(true, { message: 'Devi confermare di aver reso anonimo il caso' })
  anonymizationConfirmed: boolean;

  @IsOptional() @IsBoolean()
  acknowledgeWarnings?: boolean;
}

export class RespondDto {
  @IsBoolean()
  accept: boolean;
}
