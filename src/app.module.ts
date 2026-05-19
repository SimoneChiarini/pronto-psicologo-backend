import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { FirebaseModule } from './firebase/firebase.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { PsychologistModule } from './psychologist/psychologist.module';
import { QuestionModule } from './question/question.module';
import { AnswerModule } from './answer/answer.module';
import { ConversationModule } from './conversation/conversation.module';
import { ReviewModule } from './review/review.module';
import { MessageModule } from './message/message.module';
import { UploadModule } from './upload/upload.module';
import { AdminModule } from './admin/admin.module';
import { AppointmentModule } from './appointment/appointment.module';
import { PostModule } from './post/post.module';

@Module({
  imports: [
    PrismaModule,
    FirebaseModule,
    AuthModule,
    UserModule,
    PsychologistModule,
    QuestionModule,
    AnswerModule,
    ConversationModule,
    ReviewModule,
    MessageModule,
    UploadModule,
    AdminModule,
    AppointmentModule,
    PostModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}