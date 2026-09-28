import { test } from "node:test";
import assert from "node:assert/strict";
import { aiConfig, generateAnswer, AiConfig } from "./ai/ai";

const config: AiConfig = {
  provider: "gemini",
  key: "test-only",
  model: "gemini-2.5-flash",
};
const answer = {
  text: "Which model?",
  sourceIds: [],
  escalate: false,
  summary: "",
};

test("Gemini configuration works without an OpenAI key; empty key uses demo", () => {
  assert.equal(aiConfig({ AI_PROVIDER: "gemini" }), null);
  assert.equal(aiConfig({ GEMINI_API_KEY: "test-only" })?.provider, "gemini");
  assert.equal(
    aiConfig({ AI_PROVIDER: "demo", GEMINI_API_KEY: "test-only" }),
    null,
  );
});

test("Gemini maps history and validates a structured answer", async () => {
  const transport: typeof fetch = async (url, init) => {
    assert.ok(!String(url).includes(config.key));
    assert.equal(
      (init?.headers as Record<string, string>)["x-goog-api-key"],
      config.key,
    );
    const body = JSON.parse(init?.body as string);
    assert.equal(body.contents[1].role, "model");
    assert.equal(body.systemInstruction.parts[0].text, "Use supplied sources");
    return Response.json({
      candidates: [
        {
          finishReason: "STOP",
          content: { parts: [{ text: JSON.stringify(answer) }] },
        },
      ],
    });
  };
  assert.deepEqual(
    await generateAnswer(
      config,
      "Use supplied sources",
      [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Which product?" },
      ],
      transport,
    ),
    answer,
  );
});

test("Gemini rejects failed, blocked, truncated and invalid responses", async () => {
  const responses = [
    new Response("private upstream error", { status: 429 }),
    Response.json({ promptFeedback: { blockReason: "SAFETY" } }),
    Response.json({ candidates: [{ finishReason: "MAX_TOKENS" }] }),
    Response.json({
      candidates: [
        {
          finishReason: "STOP",
          content: { parts: [{ text: '{"text":"unsupported"}' }] },
        },
      ],
    }),
  ];
  for (const response of responses) {
    await assert.rejects(generateAnswer(config, "", [], async () => response));
  }
});
