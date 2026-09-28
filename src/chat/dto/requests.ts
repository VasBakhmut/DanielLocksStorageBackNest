import { BadRequestException } from "@nestjs/common";
import { z } from "zod";
import { actions } from "../conversation";

export const createSessionSchema = z
  .object({
    entryPoint: z.enum(["widget", "technical_support", "product"]),
    productId: z
      .string()
      .regex(/^[A-Za-z0-9-]{1,30}$/)
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (value.entryPoint === "product" && !value.productId) {
      ctx.addIssue({ code: "custom", message: "Product is required" });
    }
  });
export const chatSchema = z
  .object({
    sessionId: z.string().uuid(),
    message: z.string().trim().min(1).max(2000).optional(),
    actionId: z.enum(actions).optional(),
  })
  .refine((value) => Boolean(value.message) || Boolean(value.actionId));
export const escalationSchema = z.object({
  sessionId: z.string().uuid(),
  name: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[^\r\n]+$/),
  email: z.string().email().max(254),
  consent: z.literal(true),
});
export type CreateSessionDto = z.infer<typeof createSessionSchema>;
export type ChatDto = z.infer<typeof chatSchema>;
export type EscalationDto = z.infer<typeof escalationSchema>;
export function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success)
    throw new BadRequestException("Please check the submitted fields.");
  return result.data;
}
