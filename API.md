# Frontend integration contract

Base URL locally: `http://localhost:3001`. JSON requests and responses; no streaming.
All POST routes return **201** on success; GET routes return **200**.
Keep all Supabase, Gemini and SMTP keys on the backend. The frontend only needs the API URL.

## Entry points

**Separate conversations per scenario.** These entry points share backend services, AI and knowledge, but MUST NOT share a session ID, transcript or mutable UI state. This replaces the previous instruction to keep one shared conversation across entry points.

| Frontend entry | Conversation key | Initial context |
| --- | --- | --- |
| Sticky corner widget | `widget` | Universal help: selection, product/company questions and technical help |
| Header > Support > Maintenance | `technical_support` | Resolve a product problem; identify the model and symptoms first, but allow other questions |
| Product page button | `product:<productCode>` | Questions about the exact product on that page; read its code from page data automatically |

Create a session on first use of each conversation key. Reopening that same key may resume its existing conversation. Do not create a session for every message or every open/close action.

Frontend state MUST be keyed by scenario, for example:

```ts
type ConversationKey = 'widget' | 'technical_support' | `product:${string}`;
// Each entry owns its sessionId, messages, quickActions, pending/error state,
// escalation draft, contact form and completion state.
const conversations = new Map<ConversationKey, ConversationState>();
```

A reusable chat component is fine; pass it the selected conversation's state. A single global `sessionId`/`messages` state shared by all three buttons is incorrect. Async responses must update the conversation that initiated the request, even if the visitor switches scenarios while waiting.

Rules:

- Opening Maintenance after using the widget starts/opens the Maintenance conversation, not the widget history.
- Opening product 59405 creates/opens `product:59405` with `productId: "59405"`. Never reuse the widget or Maintenance session for it.
- Opening product 59410 creates/opens `product:59410`; it must not show the 59405 history.
- A sticky widget opened while viewing a product remains the universal `widget` conversation. Only the product chat button establishes the page's product context.
- Switching scenarios preserves other conversations separately. New conversation resets only the selected key. An email handoff in one conversation does not close the others.
- Entry point sets the initial purpose, not a hard topic restriction. Maintenance can answer product questions too; the widget can troubleshoot. Product chat stays grounded in the selected model without assuming ownership or a fault.
- The backend creates a new UUID on every `POST /sessions`; it does not merge sessions by visitor. Frontend code must select the correct stored UUID for every `/chat` and `/escalations` request.
- Reload restoration is not currently exposed by the API. Keep complete conversation state in memory for this prototype; a stored UUID alone cannot reconstruct history after refresh.

Frontend acceptance checks: open all three scenarios and confirm different IDs; open two different products and confirm different IDs and correct product codes; close/reopen one scenario and confirm only its history returns; switch scenarios during a pending response and confirm the reply appears only in its originating conversation.

`POST /sessions`

```json
{"entryPoint":"widget"}
```

```json
{"entryPoint":"technical_support"}
```

```json
{"entryPoint":"product","productId":"59410"}
```

- `widget`: universal assistant; selection, product questions and support.
- `technical_support`: Header > Support > Maintenance. Primary purpose is resolving a product problem, without restricting other topics. Start by selecting/identifying a model and describing the problem. Send the selected model code as the next chat message.
- `product`: frontend automatically passes the actual product code from the current page. Context is known, intent and ownership are unknown. Do not greet the visitor as someone reporting a fault.
- `productId`: optional except for product entry; 1–30 letters, digits or hyphens. Automatic model recognition in free text currently supports five-digit codes.

Response shape:

```json
{
  "id":"<session UUID>",
  "ok":true,
  "chatMode":"live",
  "aiProvider":"gemini",
  "mailMode":"capture",
  "entryPoint":"product",
  "intent":"unknown",
  "productId":"59410",
  "quickActions":[{"id":"product_info","label":"Product details"}]
}
```

The actions shown above are abbreviated. Render the full array returned by the API. `productId` is omitted when unknown. Intent values: `unknown`, `product_info`, `selection`, `technical_support`, `availability`. `chatMode` is `live` or `demo`; `aiProvider` is `gemini`, `openai` or `demo`.

There is no initial assistant message in this response. Suggested frontend greetings:

| Entry | Greeting |
| --- | --- |
| widget | How can I help? Ask about products, choosing hardware or a technical issue. |
| technical_support | Which model do you need help with? Select a model or enter its code. |
| product | What would you like to know about this product? |

## Messages and quick actions

`POST /chat`

```json
{"sessionId":"<session UUID>","message":"Will this fit a 45mm door?"}
```

or

```json
{"sessionId":"<session UUID>","actionId":"product_info"}
```

Send one of `message` (1–2000 characters after trimming) or `actionId`. If both are sent, the action takes precedence. Allowed actions: `product_info`, `selection`, `compatibility`, `technical_support`, `availability`, `stockists`, `unknown_model`, `battery_issue`, `connection_issue`.

```json
{
  "text":"<assistant answer>",
  "sources":[{"id":"product-59410","title":"<source title>","url":"<source URL>"}],
  "escalate":false,
  "draft":null,
  "chatMode":"live",
  "productId":"59410",
  "intent":"product_info",
  "quickActions":[{"id":"technical_support","label":"Technical help"}]
}
```

Replace quick buttons after every response; keep free text available. Disable sending while a request is pending. Allow up to 60 seconds for AI responses. Render text safely, not as raw HTML. Source URLs beginning `/documents/` refer to frontend-hosted PDFs; copy the files from `../DanielLocksMaterials/resources/public/documents` to your frontend's public documents folder or configure equivalent URLs before showing citations. The API does not currently serve these files. Product images use `/assets/59410.jpg`; its preserved file is in `../DanielLocksMaterials/resources/public/assets`.

When `escalate:true`, `draft` contains `subject`, `summary`, `model`, `conversation`; `quickActions` is empty. Show the summary and a form for name, email and consent. No email has been sent yet. Further `/chat` calls for this session return 409. Human correspondence continues by email after successful submission.

## Email handoff

`POST /escalations`

```json
{"sessionId":"<session UUID>","name":"Test Customer","email":"customer@example.com","consent":true}
```

```json
{"id":"<ticket UUID>","delivery":"captured","email":"customer@example.com"}
```

`captured` means local preview only: show "Request saved for this demo; no email was sent." `sent` means SMTP accepted the request: show that the team will reply by email. Do not claim final inbox delivery. If sending fails, preserve the form and allow retry. Repeating a successful submission returns the same ticket within the current persistence/concurrency guarantees. This prototype is intended for a single API instance; it does not have a transactional mail outbox.

## Catalogue and health

- `GET /products`: array of `{id,name,finish,image,facts:string[],source}`. Currently one curated product, 59410. Do not present this as the full catalogue. Technical SOP coverage is broader.
- `GET /health`: `{ok,chatMode,aiProvider,mailMode}`. Shows configured runtime mode, not a live AI-provider or SMTP probe.

## Errors and UX

Nest error body: `{statusCode,message,error}` (the `error` field may vary).

| Status | Frontend handling |
| --- | --- |
| 400 | Invalid input, missing consent, or conversation length limit. Correct input; start a new session for the limit. |
| 404 | Session not found; offer a new conversation. |
| 409 | Request already pending, chat handed off, or no escalation pending. Respect the current UI state; do not retry blindly. |
| 503 | AI or email temporarily unavailable; keep the user's input and offer retry. |
| 500 / network error | Generic failure; keep input and avoid claiming success. |

The session UUID acts as a bearer capability: anyone possessing it can use that session. Do not place it in public URLs or analytics. Authentication and public abuse controls are not implemented.

## Configuration and current scope

One `.env` at the workspace root. `CORS_ORIGINS` is a comma-separated list of exact frontend origins, defaulting to localhost:3000 and 127.0.0.1:3000. Restart the backend after environment changes. Example for a frontend on port 5173:

```env
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Supabase persists sessions and receives curated seed records at startup. Answers still use the versioned curated knowledge file; scraped staging records are not automatically approved or used. Live stock/pricing, attachments, conversation restoration endpoints, completed-session reporting emails and a full diagnostic flow engine are not implemented. This contract describes working prototype endpoints only.

## Frontend request example

```ts
const apiUrl = 'http://localhost:3001';
async function post(path: string, payload: unknown) {
  const response = await fetch(apiUrl + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message || 'Request failed');
  return body;
}
const session = await post('/sessions', { entryPoint: 'product', productId: '59410' });
const answer = await post('/chat', { sessionId: session.id, actionId: 'product_info' });
```
