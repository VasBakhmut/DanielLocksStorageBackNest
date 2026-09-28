import { Module } from "@nestjs/common";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";
import { PersistenceModule } from "../persistence/persistence.module";
import { MailModule } from "../mail/mail.module";
import { AiModule } from "../ai/ai.module";
@Module({
  imports: [PersistenceModule, MailModule, AiModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
