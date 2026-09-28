export const products = [
  {
    id: "59410",
    name: "Digital Smart Entrance Set",
    finish: "Matt Black",
    image: "/assets/59410.jpg",
    facts: [
      "Adjustable 60–70mm tubular latch",
      "Door thickness 35–60mm",
      "On-board Wi-Fi, used with TTLOCK app",
      "Retro fit onto existing doors",
      "Includes 3 swipe cards",
      "239 × 79mm, 26mm depth",
    ],
    source: "https://austyle.com.au/product/digital-smart-lever-set-59410/",
  },
];
export const sources = [
  {
    id: "product-59410",
    title: "59410 · Product specifications",
    url: products[0].source,
    models: ["59410"],
    text: products[0].facts.join(". "),
  },
  {
    id: "battery",
    title: "Rapid Battery Drain · SOP V0124",
    url: "/documents/battery.pdf",
    models: ["59410", "59405", "59400", "59409"],
    text: "Rapid battery drain: check frequency of use, battery quality, firmware, environmental conditions and connectivity use. Use fresh, high-quality batteries of the recommended type; exact battery chemistry is not specified here. Check for available firmware updates. Internal connections and faults require qualified maintenance personnel. If unresolved, contact technical support. Do not invent battery life or app menu paths.",
  },
  {
    id: "troubleshooting",
    title: "Digital Lock Troubleshooting · pp. 1–2",
    url: "/documents/troubleshooting.pdf",
    models: ["59410", "59405", "59400", "59409"],
    text: "Non-working digital lock: use high-quality batteries. On Apple iPhone reset Bluetooth, then link phone to lock again. In app Settings update firmware/software while close to the lock. Hard reset restores factory settings. Reset timing differs from SOP, so confirm with support instead of providing reset instructions in this prototype.",
  },
  {
    id: "reset",
    title: "Factory Reset · SOP V0124",
    url: "/documents/reset.pdf",
    models: ["59410", "59405", "59400", "59409"],
    text: "Factory reset restores original configuration and requires initialization and administrator setup. Intended for maintenance team and authorised personnel. Reset timing differs between supplied documents (5 seconds vs 5–10 seconds). Do not give the reset sequence until manufacturer confirms model-specific instructions. Escalate reset requests to technical support.",
  },
];
export type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
};
export type Answer = {
  text: string;
  sourceIds: string[];
  escalate: boolean;
  summary: string;
};
export type Session = {
  id: string;
  mode: "support" | "sales";
  entryPoint?: "widget" | "technical_support" | "product";
  intent?:
    | "unknown"
    | "product_info"
    | "selection"
    | "technical_support"
    | "availability";
  productId?: string;
  messages: Message[];
  stage: number;
  topic?: string;
  status: "active" | "needs_email" | "closed";
  summary?: string;
  ticket?: { id: string; delivery: "captured" | "sent"; email: string };
  createdAt: string;
};
const answer = (
  text: string,
  sourceIds: string[] = [],
  escalate = false,
  summary = "",
): Answer => ({ text, sourceIds, escalate, summary });
export function demoAnswer(s: Session, message: string): Answer {
  const input = message.toLowerCase();
  const mentioned = message.match(/\b\d{5}\b/)?.[0];
  if (
    mentioned &&
    (!s.entryPoint || !s.productId || s.productId === mentioned)
  ) {
    if (s.productId && s.productId !== mentioned) {
      s.stage = 0;
      s.topic = undefined;
    }
    s.productId = mentioned;
  }
  if (/reset|factory/.test(input))
    return answer(
      "The supplied reset documents differ. I cannot confirm the correct procedure for your lock. I can prepare an email for our technical team to check your model and advise you.",
      ["reset"],
      true,
      "Confirm the correct model-specific factory reset procedure.",
    );
  if (
    /did(n.t| not) help|still|not resolved|does(n.t| not) work|human|specialist|email|all.*tried/.test(
      input,
    ) &&
    (s.stage > 0 || /human|specialist|email/.test(input))
  )
    return answer(
      "I’m sorry, I don’t have a confirmed solution for this issue. I’ll prepare the details and the checks we’ve discussed for our technical team. They will reply by email.",
      [],
      true,
      "The issue remains unresolved after the checks discussed. Please review the conversation and advise the customer.",
    );
  if (/thank|resolved|working now|fixed/.test(input))
    return answer(
      "Glad that helped. If another issue comes up, tell me the model and what you’re seeing.",
    );
  if (/technical help|technical support/.test(input)) {
    s.mode = "support";
    return answer(
      s.productId
        ? `What is happening with your ${s.productId}?`
        : "Which Austyle model do you have, and what is happening with the lock?",
    );
  }
  if (
    (!s.entryPoint || s.intent === "technical_support") &&
    /battery|batteries|drain/.test(input)
  ) {
    s.topic = "battery";
  }
  if (
    (!s.entryPoint || s.intent === "technical_support") &&
    /bluetooth|iphone|connect|pair/.test(input)
  ) {
    s.topic = "bluetooth";
  }
  if (s.mode === "support" || s.topic) {
    if (!s.productId)
      return answer(
        "Which Austyle model do you have? You can find the product code on the packaging or instruction manual, for example 59410.",
      );
    if (!["59410", "59405", "59400", "59409"].includes(s.productId))
      return answer(
        `I don’t have verified troubleshooting instructions for model ${s.productId} in this prototype. I can prepare your question for the technical team.`,
        [],
        true,
        "Model is outside the verified prototype knowledge base.",
      );
    if (s.topic === "battery") {
      if (s.stage >= 2)
        return answer(
          "We’ve reached the end of the verified checks available in this demo. I can send the details to our technical team for further diagnosis by email.",
          ["battery"],
          true,
          "Battery drain remains unresolved after battery and firmware checks.",
        );
      if (s.stage++ === 0)
        return answer(
          `Let’s check the batteries in your ${s.productId} first. The Austyle SOP recommends fresh, high-quality batteries of the recommended type. Have you already replaced the batteries, and roughly how quickly are they draining?`,
          ["battery"],
        );
      return answer(
        "The next documented check is firmware. While standing close to the lock, open Settings in the app and check for firmware/software updates. Frequent use and environmental conditions can also affect battery life. Have you checked for an update?",
        ["battery", "troubleshooting"],
      );
    }
    if (s.topic === "bluetooth") {
      if (s.stage++ === 0)
        return answer(
          "Are you using an Apple iPhone or an Android phone? The supplied guide includes a specific Bluetooth check for iPhone.",
          ["troubleshooting"],
        );
      if (/iphone|apple|ios/.test(input))
        return answer(
          "The Austyle troubleshooting guide recommends resetting Bluetooth on your iPhone, then linking the phone to the lock again. Try this close to your lock. Did that restore the connection?",
          ["troubleshooting"],
        );
      return answer(
        "I don’t have a verified next step for that phone and connection issue in the supplied guide. I can prepare an email for the technical team.",
        [],
        true,
        "Connection issue requires model- and phone-specific guidance.",
      );
    }
    if (/^\s*(hi|hello|hey|\d{5})[.!\s]*$/.test(input))
      return answer(
        `What is happening with your ${s.productId}? For example, batteries draining quickly or a Bluetooth connection problem.`,
      );
    return answer(
      "I’m sorry, I don’t have a verified answer for this problem in the supplied documents. I can prepare an email with your question for our technical team.",
      [],
      true,
      "No verified answer found in the supplied documents.",
    );
  }
  if (/price|stock|warranty|water|rain|fire|alexa/.test(input))
    return answer(
      "I don’t have confirmed information for that question in this prototype. I can pass the question to our team by email.",
      [],
      true,
      "Product question requires confirmation from the team.",
    );
  if (!s.productId && /choose|recommend|door|lock|product/.test(input))
    return answer(
      "This preview includes the 59410 Digital Smart Entrance Set. It suits doors 35–60mm thick and includes an adjustable 60–70mm tubular latch. What is your door thickness and existing latch backset?",
      ["product-59410"],
    );
  if (
    (!s.productId || s.productId === "59410") &&
    /59410|wifi|wi-fi|ttlock|dimension|thickness|swipe|latch|fit|size|features/.test(
      input,
    )
  )
    return answer(
      "The 59410 has on-board Wi-Fi and uses the TTLOCK app. It includes 3 swipe cards and an adjustable 60–70mm tubular latch, and suits door thicknesses of 35–60mm. The matt black body measures 239 × 79mm with 26mm depth. Existing door preparation still needs checking before fitting.",
      ["product-59410"],
    );
  if (/^\s*(hi|hello|hey)[.!\s]*$/.test(input))
    return answer(
      "Hello! I can help with the 59410 smart lock or a technical issue. What would you like to know?",
    );
  return answer(
    "I don’t have a verified answer in the prototype catalogue. I can prepare your question for our team to answer by email.",
    [],
    true,
    "Question is outside the verified prototype catalogue.",
  );
}
