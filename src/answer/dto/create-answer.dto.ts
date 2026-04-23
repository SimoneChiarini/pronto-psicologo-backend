import { IsString } from 'class-validator';

export class CreateAnswerDto {
  @IsString()
  questionId: string;

  @IsString()
  content: string;
}
