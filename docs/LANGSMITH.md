# LangSmith Integration

## Overview

Guillermo's chat route (`app/api/chat/route.ts`) sends traces to [LangSmith](https://smith.langchain.com) for conversation review. Each request creates a run with the user's messages as input and Guillermo's response as output. Runs are grouped into conversation threads via `session_id` metadata.

## Environment Variables

```
LANGCHAIN_API_KEY=lsv2_pt_...     # Personal access token from Settings → API Keys
LANGCHAIN_TRACING_V2=true         # Must be "true" to enable
LANGCHAIN_PROJECT=guillermo-chat  # Project name in LangSmith
```

Set in `.env.local` for dev, Vercel dashboard (Production + Preview) for deployed environments.

## Current Approach: Manual Client

We use `langsmith`'s `Client` class directly with `createRun()` / `updateRun()`.

```typescript
const langsmith = new Client();

// Request start
langsmith.createRun({
  id: runId,
  name: "guillermo-chat",
  run_type: "chain",
  project_name: process.env.LANGCHAIN_PROJECT ?? "guillermo-chat",
  inputs: { messages },
  extra: { metadata: { session_id: conversationId } },
  start_time: Date.now(),
});

// After fullStream is consumed, in the finally block
await langsmith.updateRun(runId, {
  outputs: { response: collectedOutput },
  end_time: Date.now(),
});
```

This is reliable on Vercel serverless because `updateRun()` is awaited before `controller.close()` — the function stays alive until the trace is closed.

**What you get:** input messages, output text, latency, session threading.
**What you don't get:** per-LLM-call child spans (waterfall view).

## Why Not `wrapAISDK`

The `langsmith` package exports `wrapAISDK` from `langsmith/experimental/vercel` which wraps `streamText()` with automatic tracing and gives a waterfall view with child spans for each LLM call and tool invocation.

**It doesn't work reliably.** The last `openai.responses` child span never closes for multi-step (agentic) conversations. The root cause:

1. `wrapAISDK` uses `traceable()` internally to wrap `streamText()`
2. `traceable()` needs `__finalTracedIteratorKey: "fullStream"` to know which property on `StreamTextResult` is the async iterable to track for completion
3. `wrapAISDK` doesn't pass this option
4. Without it, `traceable`'s `processOutputs` tries to `await result.content`, which can't resolve until `fullStream` is consumed — but `fullStream` can't be consumed until `await streamText()` resolves. **Deadlock.**
5. Without `await`, the trace never flushes on Vercel because the function terminates before the background promise completes

### What we tried (and why it failed)

| Approach | Result |
|---|---|
| `await streamText()` | Deadlock on multi-step conversations |
| `await result.text` in finally block | Works locally, not on Vercel serverless |
| `await result.usage` in finally block | Same — works locally, not on Vercel |
| `after()` + `awaitPendingTraceBatches()` | Flushes pending batches, but the span was never *ended*, just unflushed |
| `traceable` with `__finalTracedIteratorKey` | Closes reliably but intermittent on Vercel; no waterfall |

### Fix on LangSmith's side

One line in `_getStreamTextWrapperConfig()` (`langsmith/dist/experimental/vercel/index.js`):

```js
__finalTracedIteratorKey: "fullStream"
```

Tracked in: https://github.com/langchain-ai/langsmith-sdk/issues — search for `__finalTracedIteratorKey`.

If this gets fixed, swap back to `wrapAISDK` for the waterfall:

```typescript
import * as ai from "ai";
import { wrapAISDK, createLangSmithProviderOptions } from "langsmith/experimental/vercel";

const { streamText } = wrapAISDK(ai);

const result = streamText({
  // ...config
  providerOptions: {
    langsmith: createLangSmithProviderOptions({
      name: "guillermo-chat",
      metadata: { session_id: conversationId },
    }),
  },
});
```

## Conversation Threading

The frontend (`components/chat-interface.tsx`) generates a `conversationId` (UUID) per chat session, stored in localStorage. It's sent in the POST body and passed to LangSmith as `session_id` metadata. The same ID is also sent in PostHog events (`guillermo_message_sent`, `guillermo_chat_closed`) so you can cross-reference between the two systems.

- New chat session or clear chat → new UUID
- Same browser session → same UUID across messages
- LangSmith Threads tab groups traces by `session_id`
