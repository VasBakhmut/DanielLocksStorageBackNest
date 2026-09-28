import { Body, Controller, Post } from "@nestjs/common";
import { ChatService } from "./chat.service";

@Controller()
export class ChatController {
  constructor(private readonly service: ChatService) {}

  @Post("sessions")
  create(@Body() body: unknown) {
    return this.service.create(body);
  }

  @Post("chat")
  chat(@Body() body: unknown) {
    return this.service.chat(body);
  }

  @Post("escalations")
  escalate(@Body() body: unknown) {
    return this.service.escalate(body);
  }
}
