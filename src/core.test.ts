import { test } from "node:test";
import assert from "node:assert/strict";
import { demoAnswer, Session } from "./knowledge/knowledge";
import { routeMessage } from "./chat/conversation";
import { ChatService } from "./chat/chat.service";
import { AiService } from "./ai/ai.service";
import { MailService } from "./mail/mail.service";
import { StoreService } from "./persistence/store.service";
const session = (productId?: string): Session => ({
  id: "test",
  mode: "support",
  productId,
  messages: [],
  stage: 0,
  status: "active",
  createdAt: "",
});
test("asks for model before troubleshooting and remembers the issue", () => {
  const s = session();
  assert.match(
    demoAnswer(s, "My batteries drain quickly").text,
    /Which Austyle model/,
  );
  const r = demoAnswer(s, "59410");
  assert.ok(r.sourceIds.includes("battery"));
  assert.match(r.text, /replaced the batteries/);
});
test("failed checks escalate instead of looping", () => {
  const s = session("59410");
  demoAnswer(s, "battery drain");
  const r = demoAnswer(s, "That did not help");
  assert.equal(r.escalate, true);
  assert.match(r.text, /email/);
});
test("unknown models never inherit another model procedure", () => {
  const r = demoAnswer(session("99999"), "battery drain");
  assert.equal(r.escalate, true);
  assert.deepEqual(r.sourceIds, []);
});
test("conflicting reset instructions are escalated without reset code", () => {
  const r = demoAnswer(session("59410"), "factory reset");
  assert.equal(r.escalate, true);
  assert.ok(!r.text.includes("000#"));
});
test("iPhone flow asks before suggesting phone-specific step", () => {
  const s = session("59410");
  assert.match(demoAnswer(s, "Bluetooth problem").text, /iPhone or an Android/);
  assert.match(demoAnswer(s, "iPhone").text, /resetting Bluetooth/);
});

test("product and widget entry do not assume a fault; technical entry asks for a model", async () => {
  const saved = new Map<string, Session>();
  const store = {
    save: async (s: Session) => {
      saved.set(s.id, structuredClone(s));
    },
    get: async (id: string) => structuredClone(saved.get(id)),
  } as unknown as StoreService;
  const app = new ChatService(store, new MailService(store), new AiService());
  const product = await app.create({
    entryPoint: "product",
    productId: "59410",
  });
  assert.equal(product.intent, "unknown");
  const details = await app.chat({
    sessionId: product.id,
    actionId: "product_info",
  });
  assert.match(details.text, /35–60mm/);
  assert.equal(details.escalate, false);
  const support = await app.chat({
    sessionId: product.id,
    actionId: "technical_support",
  });
  assert.equal(support.intent, "technical_support");
  assert.equal(support.productId, "59410");
  assert.equal(saved.get(product.id)?.messages.length, 4);
  const stock = await app.chat({
    sessionId: product.id,
    actionId: "availability",
  });
  assert.equal(stock.escalate, false);
  assert.match(stock.text, /not connected/);
  const technical = await app.create({ entryPoint: "technical_support" });
  assert.equal(technical.intent, "technical_support");
  assert.equal(technical.productId, undefined);
  const widget = await app.create({ entryPoint: "widget" });
  assert.equal(widget.intent, "unknown");
  await assert.rejects(app.create({ entryPoint: "product" }));
  await assert.rejects(
    app.chat({ sessionId: product.id, actionId: "invented-action" }),
  );
});

test("comparing models does not silently replace active product", () => {
  const s = session("59410");
  s.intent = "product_info";
  s.mode = "sales";
  assert.equal(routeMessage(s, "Compare 59410 and 59405"), null);
  assert.equal(s.productId, "59410");
  assert.equal(s.intent, "product_info");
});

test("explicit battery fault changes intent but a battery specification question does not", () => {
  const s = session("59410");
  s.intent = "unknown";
  s.mode = "sales";
  routeMessage(s, "What batteries does it use?");
  assert.equal(s.intent, "unknown");
  routeMessage(s, "My batteries drain quickly");
  assert.equal(s.intent, "technical_support");
});
