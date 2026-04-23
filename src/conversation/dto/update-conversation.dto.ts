import { IsOptional, IsString } from 'class-validator';

export class UpdateConversationDto {
  @IsOptional()
  @IsString()
  firstQuestionId?: string;

  @IsOptional()
  @IsString()
  firstAnswerId?: string;
}
