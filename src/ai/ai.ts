import { z } from "zod";
import { Answer, Session } from "../knowledge/knowledge";

type Env = Record<string, string | undefined>;
export type AiConfig = {
  provider: "gemini" | "openai";
  key: string;
  model: string;
};
export function aiConfig(env: Env = process.env): AiConfig | null {
  const geminiKey = env.GEMINI_API_KEY?.trim() || env.GOOGLE_API_KEY?.trim();
  const provider =
    env.AI_PROVIDER?.trim().toLowerCase() || (geminiKey ? "gemini" : "openai");
  if (!["gemini", "openai", "demo"].includes(provider))
    throw new Error("AI_PROVIDER must be gemini, openai or demo.");
  if (provider === "demo") return null;
  if (provider === "gemini") {
    if (!geminiKey) return null;
    const model = env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
    if (!/^[a-zA-Z0-9._-]+$/.test(model))
      throw new Error("GEMINI_MODEL must be a model ID, not a URL.");
    return { provider: "gemini", key: geminiKey, model };
  }
  if (!env.OPENAI_API_KEY?.trim() || !env.OPENAI_MODEL?.trim()) return null;
  return {
    provider: "openai",
    key: env.OPENAI_API_KEY.trim(),
    model: env.OPENAI_MODEL.trim(),
  };
}

const answerSchema = z
  .object({
    text: z.string().min(1).max(8000),
    sourceIds: z.array(z.string()),
    escalate: z.boolean(),
    summary: z.string().max(3000),
  })
  .strict();
const jsonSchema = {
  type: "object",
  properties: {
    text: { type: "string" },
    sourceIds: { type: "array", items: { type: "string" } },
    escalate: { type: "boolean" },
    summary: { type: "string" },
  },
  required: ["text", "sourceIds", "escalate", "summary"],
  additionalProperties: false,
};

// Inject the transport for tests; no keys or upstream response bodies are logged.
export async function generateAnswer(
  config: AiConfig,
  instructions: string,
  messages: Session["messages"],
  transport: typeof fetch = fetch,
): Promise<Answer> {
  let url: string, headers: Record<string, string>, body: unknown;
  if (config.provider === "gemini") {
    url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`;
    headers = {
      "x-goog-api-key": config.key,
      "Content-Type": "application/json",
    };
    body = {
      systemInstruction: { parts: [{ text: instructions }] },
      contents: messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      generationConfig: {
        responseMimeType: "application/json",
        responseJsonSchema: jsonSchema,
        maxOutputTokens: 8192,
      },
    };
  } else {
    url = "https://api.openai.com/v1/responses";
    headers = {
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json",
    };
    body = {
      model: config.model,
      store: false,
      max_output_tokens: 1600,
      instructions,
      input: messages.map(({ role, content }) => ({ role, content })),
      text: {
        format: {
          type: "json_schema",
          name: "support_answer",
          strict: true,
          schema: jsonSchema,
        },
      },
    };
  }
  const response = await transport(url, {
    method: "POST",
    signal: AbortSignal.timeout(45000),
    headers,
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("AI request failed");
  const data = await response.json();
  let text: string;
  if (config.provider === "gemini") {
    const candidate = data.candidates?.[0];
    if (data.promptFeedback?.blockReason || candidate?.finishReason !== "STOP")
      throw new Error("AI response incomplete or blocked");
    text = (candidate.content?.parts || [])
      .filter((p: any) => typeof p.text === "string" && !p.thought)
      .map((p: any) => p.text)
      .join("");
  } else {
    if (data.status !== "completed") throw new Error("AI response incomplete");
    text = (data.output || [])
      .flatMap((x: any) => x.content || [])
      .filter((x: any) => x.type === "output_text")
      .map((x: any) => x.text)
      .join("");
  }
  return answerSchema.parse(JSON.parse(text));
}
