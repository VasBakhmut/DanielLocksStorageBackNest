import { Injectable } from "@nestjs/common";
import { aiConfig, generateAnswer } from "./ai";
import { Session } from "../knowledge/knowledge";
@Injectable()
export class AiService {
  answer(instructions: string, messages: Session["messages"]) {
    const config = aiConfig();
    if (!config) throw new Error("AI is not configured");
    return generateAnswer(config, instructions, messages);
  }
}
