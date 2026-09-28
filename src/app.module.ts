import { Module } from "@nestjs/common";
import { ChatModule } from "./chat/chat.module";
import { KnowledgeModule } from "./knowledge/knowledge.module";
import { HealthModule } from "./health/health.module";
@Module({ imports: [ChatModule, KnowledgeModule, HealthModule] })
export class AppModule {}
