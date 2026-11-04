import {
  ArrayMaxSize, Equals, IsArray, IsBoolean, IsDateString, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength,
} from 'class-validator';

export class CreateGroupDto {
  @IsString() @MinLength(3) @MaxLength(120)
  name: string;

  @IsOptional() @IsString() @MaxLength(2000)
  description?: string;

  @IsIn(['PUBLIC', 'PRIVATE'])
  visibility: string;

  @IsOptional() @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) @MaxLength(100, { each: true })
  topics?: string[];

  // Patto di riservatezza del gruppo
  @Equals(true, { message: 'Devi accettare l\'impegno alla riservatezza' })
  confidentialityAccepted: boolean;
}

export class UpdateGroupDto {
  @IsOptional() @IsString() @MinLength(3) @MaxLength(120)
  name?: string;

  @IsOptional() @IsString() @MaxLength(2000)
  description?: string;

  @IsOptional() @IsIn(['PUBLIC', 'PRIVATE'])
  visibility?: string;

  @IsOptional() @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) @MaxLength(100, { each: true })
  topics?: string[];
}

export class JoinGroupDto {
  @Equals(true, { message: 'Devi accettare l\'impegno alla riservatezza' })
  confidentialityAccepted: boolean;
}

export class InviteDto {
  @IsUUID()
  psychologistId: string;
}

export class CreateCaseDto {
  @IsString() @MinLength(3) @MaxLength(160)
  title: string;

  @IsOptional() @IsIn(['0-12', '13-17', '18-25', '26-40', '41-60', '61+'])
  ageRange?: string;

  @IsOptional() @IsIn(['PRIVATE', 'PUBLIC_SERVICE', 'ONLINE', 'OTHER'])
  setting?: string;

  @IsString() @MinLength(10) @MaxLength(5000)
  presentingProblem: string;

  @IsString() @MinLength(5) @MaxLength(2000)
  question: string;

  @Equals(true, { message: 'Devi confermare di aver reso anonimo il caso' })
  anonymizationConfirmed: boolean;

  // true = l'autore ha visto gli avvisi del controllo automatico e conferma comunque
  @IsOptional() @IsBoolean()
  acknowledgeWarnings?: boolean;
}

export class UpdateCaseDto {
  @IsIn(['OPEN', 'CLOSED'])
  status: string;
}

export class CreateCaseMessageDto {
  @IsString() @MinLength(1) @MaxLength(5000)
  content: string;

  @IsOptional() @IsBoolean()
  acknowledgeWarnings?: boolean;
}

export class CreateMeetingDto {
  @IsString() @MinLength(3) @MaxLength(160)
  title: string;

  @IsDateString()
  startsAt: string;

  @IsString() @MaxLength(500)
  url: string;
}
