import { IsString } from 'class-validator';

export class CreateConversationDto {
  @IsString()
  psychologistId: string;

  @IsString()
  firstQuestionId: string;

  @IsString()
  firstAnswerId: string;
}
