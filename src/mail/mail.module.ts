import { Module } from "@nestjs/common";
import { MailService } from "./mail.service";
import { PersistenceModule } from "../persistence/persistence.module";
@Module({
  imports: [PersistenceModule],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
