import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import nodemailer from "nodemailer";
import { StoreService } from "../persistence/store.service";

@Injectable()
export class MailService {
  constructor(private readonly store: StoreService) {}
  async deliver(
    ticketId: string,
    mail: {
      from?: string;
      to?: string;
      replyTo: string;
      subject: string;
      text: string;
      messageId: string;
    },
  ): Promise<"sent" | "captured"> {
    let delivery: "sent" | "captured" = "captured";
    if (process.env.MAIL_MODE === "smtp") {
      if (!process.env.SMTP_HOST || !mail.from || !mail.to)
        throw new ServiceUnavailableException(
          "Email is not configured. Your conversation has been kept.",
        );
      try {
        const transport = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: process.env.SMTP_SECURE === "true",
          auth: process.env.SMTP_USER
            ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
            : undefined,
          connectionTimeout: 10000,
          socketTimeout: 15000,
        });
        const result = await transport.sendMail(mail);
        if (!result.accepted.length) throw new Error("Not accepted");
        delivery = "sent";
      } catch {
        throw new ServiceUnavailableException(
          "The email could not be sent. Please try again.",
        );
      }
    } else
      await this.store.capture(ticketId, {
        ...mail,
        from: "prototype@local.test",
        to: "support@local.test",
        delivery: "captured",
        createdAt: new Date().toISOString(),
      });
    return delivery;
  }
}
