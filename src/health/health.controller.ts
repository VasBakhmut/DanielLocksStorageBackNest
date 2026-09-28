import { Controller, Get } from "@nestjs/common";
import { aiConfig } from "../ai/ai";

@Controller("health")
export class HealthController {
  @Get()
  health() {
    return {
      ok: true,
      chatMode: aiConfig() ? "live" : "demo",
      aiProvider: aiConfig()?.provider || "demo",
      mailMode: process.env.MAIL_MODE === "smtp" ? "smtp" : "capture",
    };
  }
}
