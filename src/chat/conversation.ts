import { Answer, Session, products } from "../knowledge/knowledge";

export const actions = [
  "product_info",
  "selection",
  "compatibility",
  "technical_support",
  "availability",
  "stockists",
  "unknown_model",
  "battery_issue",
  "connection_issue",
] as const;
export type Action = (typeof actions)[number];
const labels: Record<Action, string> = {
  product_info: "Product details",
  selection: "Find or compare products",
  compatibility: "Will it fit?",
  technical_support: "Technical help",
  availability: "Availability",
  stockists: "Where to buy",
  unknown_model: "I don’t know the model",
  battery_issue: "Batteries drain quickly",
  connection_issue: "Phone connection problem",
};
const reply = (text: string, sourceIds: string[] = []): Answer => ({
  text,
  sourceIds,
  escalate: false,
  summary: "",
});
export function actionLabel(action: Action) {
  return labels[action];
}
export function quickActions(s: Session) {
  const list: Action[] =
    s.intent === "technical_support"
      ? s.productId
        ? ["battery_issue", "connection_issue", "product_info"]
        : ["unknown_model"]
      : s.productId
        ? [
            "product_info",
            "compatibility",
            "selection",
            "technical_support",
            "availability",
          ]
        : ["selection", "product_info", "technical_support", "stockists"];
  return list.map((id) => ({ id, label: labels[id] }));
}

// Only unambiguous text is routed locally. Ambiguous requests still reach the AI.
export function routeMessage(
  s: Session,
  text: string,
  action?: Action,
): Answer | null {
  const t = text.trim().toLowerCase();
  const codes = [...new Set(text.match(/\b\d{5}\b/g) || [])];
  if (!s.productId && codes.length === 1) s.productId = codes[0];
  if (s.productId && codes.some((code) => code !== s.productId) && !action) {
    return null; // A comparison must not silently change the active product.
  }
  if (!action) {
    if (/^(hi|hello|hey)[!. ]*$/.test(t))
      return reply("Hello! What would you like to know?");
    if (
      /^(technical help|technical support|i need technical help)[!. ]*$/.test(t)
    )
      action = "technical_support";
    else if (/^(stock|availability|is (it|this) in stock\??)$/.test(t))
      action = "availability";
    else if (
      /batter(y|ies).*(drain|flat|last|dead)|drain.*batter/.test(t) ||
      /phone.*(won.t|cannot|can.t).*connect/.test(t)
    ) {
      s.intent = "technical_support";
      s.mode = "support";
    } else if (
      /^(what are the features\??|product details|tell me about( the)? \d{5}[?.]?)$/.test(
        t,
      )
    )
      action = "product_info";
  }
  if (action === "unknown_model")
    return reply(
      "Look for a product code on the packaging or instruction manual. You can also describe the lock and any visible markings. Please do not share PINs or access codes.",
    );
  if (action === "stockists")
    return reply(
      "Use the “Where to buy” link in the website menu to find a stockist. A stockist can confirm their own availability.",
    );
  if (action === "availability") {
    s.intent = "availability";
    s.mode = "sales";
    return reply(
      "Live stock data is not connected in this prototype. I cannot confirm availability. A stockist can confirm their own stock; supplier stock and store stock can differ.",
    );
  }
  if (
    action === "technical_support" ||
    action === "battery_issue" ||
    action === "connection_issue"
  ) {
    s.intent = "technical_support";
    s.mode = "support";
    if (action !== "technical_support") {
      s.topic = action === "battery_issue" ? "battery" : "bluetooth";
      s.stage = 0;
    }
    return reply(
      !s.productId
        ? "Which model do you need help with? Select a model below or type its code. If you don’t know it, I can help identify it."
        : action === "technical_support"
          ? `What is happening with the ${s.productId}? Tell me what you have already tried.`
          : `Tell me more about the ${s.productId}: ${action === "battery_issue" ? "how quickly do the batteries drain, and what have you already checked?" : "what happens when you try to connect, and which phone do you use?"}`,
    );
  }
  if (action === "selection" || action === "compatibility") {
    s.intent = "selection";
    s.mode = "sales";
    s.topic = undefined;
    s.stage = 0;
    return reply(
      action === "compatibility"
        ? "What is your door thickness and existing latch backset? I’ll compare these with the documented dimensions; other installation details may also need checking."
        : "What are you looking for, and what type of door is it for? This preview has full product specifications for 59410 only, so I won’t invent alternatives.",
    );
  }
  if (action === "product_info") {
    s.intent = "product_info";
    s.mode = "sales";
    s.topic = undefined;
    s.stage = 0;
    const product = products.find((p) => p.id === s.productId);
    return reply(
      product
        ? `${product.name} ${product.id}:\n${product.facts.map((f) => "• " + f).join("\n")}`
        : s.productId
          ? `What would you like to know about ${s.productId}? Product specifications for this model are not yet included in this preview.`
          : "Which product would you like to know about? Enter its name or product code.",
      product ? ["product-" + product.id] : [],
    );
  }
  if (/^\d{5}$/.test(t))
    return reply(
      s.intent === "technical_support"
        ? `What is happening with the ${s.productId}? Tell me what you have already tried.`
        : `What would you like to know about ${s.productId}?`,
    );
  return null;
}
