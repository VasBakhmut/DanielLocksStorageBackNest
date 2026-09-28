import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { StoreService } from "./persistence/store.service";
import { Session } from "./knowledge/knowledge";

test("Nest module wiring and HTTP contract: entry points, validation, email handoff", async () => {
  process.env.AI_PROVIDER = "demo";
  process.env.MAIL_MODE = "capture";
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  const app = await NestFactory.create(AppModule, { logger: false });
  const store = app.get(StoreService);
  const sessions = new Map<string, Session>();
  let captures = 0;
  store.init = async () => {};
  store.save = async (s) => {
    sessions.set(s.id, structuredClone(s));
  };
  store.get = async (id) => structuredClone(sessions.get(id) || null);
  store.capture = async () => {
    captures++;
  };
  try {
    await app.listen(0, "127.0.0.1");
    const base = await app.getUrl();
    const post = async (path: string, body: unknown) => {
      const response = await fetch(base + path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return { status: response.status, body: (await response.json()) as any };
    };
    assert.equal((await fetch(base + "/health")).status, 200);
    assert.equal((await fetch(base + "/products")).status, 200);
    assert.equal(
      (await post("/sessions", { entryPoint: "product" })).status,
      400,
    );
    for (const entryPoint of ["widget", "technical_support", "product"]) {
      const result = await post("/sessions", {
        entryPoint,
        ...(entryPoint === "product" ? { productId: "59410" } : {}),
      });
      assert.equal(result.status, 201);
      assert.equal(
        result.body.intent,
        entryPoint === "technical_support" ? "technical_support" : "unknown",
      );
      assert.ok(result.body.quickActions.length);
    }
    const { body: session } = await post("/sessions", {
      entryPoint: "product",
      productId: "59410",
    });
    const contact = {
      sessionId: session.id,
      name: "Prototype test",
      email: "test@example.com",
      consent: true,
    };
    assert.equal((await post("/escalations", contact)).status, 409);
    const details = await post("/chat", {
      sessionId: session.id,
      actionId: "product_info",
    });
    assert.equal(details.status, 201);
    assert.equal(details.body.escalate, false);
    assert.ok(details.body.sources.length);
    assert.equal((await post("/chat", { sessionId: session.id })).status, 400);
    const unresolved = await post("/chat", {
      sessionId: session.id,
      message: "factory reset",
    });
    assert.equal(unresolved.body.escalate, true);
    assert.ok(unresolved.body.draft.subject);
    assert.equal(
      (await post("/escalations", { ...contact, consent: false })).status,
      400,
    );
    const ticket = await post("/escalations", contact);
    assert.equal(ticket.body.delivery, "captured");
    assert.deepEqual((await post("/escalations", contact)).body, ticket.body);
    assert.equal(captures, 1);
    assert.equal(
      (await post("/chat", { sessionId: session.id, message: "hello" })).status,
      409,
    );
  } finally {
    await app.close();
  }
});
