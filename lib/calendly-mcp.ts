/**
 * Calendly MCP Client
 *
 * Connects to Calendly's remote MCP server (https://mcp.calendly.com) via
 * Streamable HTTP transport to fetch calendar availability and create
 * single-use scheduling links.
 *
 * OAuth tokens are stored in Upstash Redis (same instance used for rate
 * limiting). Pablo authorises once via `npm run calendly-auth`; the server
 * refreshes tokens automatically at runtime.
 */

import { Client } from "@modelcontextprotocol/sdk/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { refreshAuthorization, discoverAuthorizationServerMetadata } from "@modelcontextprotocol/sdk/client/auth.js";
import type { OAuthTokens, OAuthClientInformation } from "@modelcontextprotocol/sdk/shared/auth.js";
import { Redis } from "@upstash/redis";
import { captureServerError } from "@/lib/posthog-server";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CALENDLY_MCP_URL = "https://mcp.calendly.com";
const CALENDLY_AUTH_SERVER_URL = "https://auth.calendly.com";

const REDIS_KEY_TOKENS = "calendly:tokens";
const REDIS_KEY_CLIENT_INFO = "calendly:client_info";
const REDIS_KEY_LOCK = "calendly:tokens:lock";

/** Buffer before expiry to trigger a proactive refresh (60 s). */
const EXPIRY_BUFFER_MS = 60_000;

/** Hard timeout for a single MCP tool call (ms). */
const MCP_TIMEOUT_MS = 8_000;

// ---------------------------------------------------------------------------
// Stored token shape (extends OAuthTokens with a timestamp)
// ---------------------------------------------------------------------------

interface StoredTokens extends OAuthTokens {
  obtained_at: number; // Date.now() when tokens were saved
}

// ---------------------------------------------------------------------------
// Lazy Redis client (fail-open when env vars are absent)
// ---------------------------------------------------------------------------

let _redis: Redis | null = null;
function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  _redis = new Redis({ url, token });
  return _redis;
}

// ---------------------------------------------------------------------------
// Public: feature flag
// ---------------------------------------------------------------------------

/**
 * Returns `true` when the Calendly integration has a chance of working:
 * Redis env vars exist AND the event type URI is configured.
 */
export function isCalendlyConfigured(): boolean {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN &&
    process.env.CALENDLY_EVENT_TYPE_URI
  );
}

// ---------------------------------------------------------------------------
// Token management
// ---------------------------------------------------------------------------

async function readTokens(): Promise<StoredTokens | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get<StoredTokens | string>(REDIS_KEY_TOKENS);
    if (!raw) return null;
    // The auth script may have double-encoded the value (stored as a JSON string
    // of a JSON string). @upstash/redis parses one level — parse again if needed.
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw) as StoredTokens;
      } catch {
        return null;
      }
    }
    return raw;
  } catch {
    return null;
  }
}

async function writeTokens(tokens: StoredTokens): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.set(REDIS_KEY_TOKENS, tokens);
}

async function readClientInfo(): Promise<OAuthClientInformation | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get<OAuthClientInformation | string>(REDIS_KEY_CLIENT_INFO);
    if (!raw) return null;
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw) as OAuthClientInformation;
      } catch {
        return null;
      }
    }
    return raw;
  } catch {
    return null;
  }
}

function isExpired(tokens: StoredTokens): boolean {
  if (!tokens.expires_in) return false; // no expiry info → assume valid
  const expiresAt = tokens.obtained_at + tokens.expires_in * 1000;
  return Date.now() >= expiresAt - EXPIRY_BUFFER_MS;
}

/**
 * Returns a valid access token, refreshing if necessary.
 * Uses a Redis lock to prevent concurrent refresh races.
 */
async function getValidAccessToken(): Promise<string | null> {
  const tokens = await readTokens();
  if (!tokens) {
    captureServerError(new Error("Calendly tokens missing from Redis — run npm run calendly-auth"), { route: "calendly-mcp", phase: "read-tokens" });
    return null;
  }

  // Token is still fresh
  if (!isExpired(tokens)) return tokens.access_token;

  // Need refresh — try to acquire lock
  if (!tokens.refresh_token) return null;

  const redis = getRedis();
  if (!redis) return null;

  const lockAcquired = await redis.set(REDIS_KEY_LOCK, "1", { nx: true, ex: 10 });

  if (!lockAcquired) {
    // Another request is refreshing — wait briefly and read the updated token
    await new Promise((r) => setTimeout(r, 2000));
    const refreshed = await readTokens();
    return refreshed?.access_token ?? null;
  }

  try {
    const clientInfo = await readClientInfo();
    if (!clientInfo) return null;

    // Discover auth server metadata for the refresh endpoint
    const metadata = await discoverAuthorizationServerMetadata(CALENDLY_AUTH_SERVER_URL).catch(() => undefined);

    const newTokens = await refreshAuthorization(CALENDLY_AUTH_SERVER_URL, {
      metadata,
      clientInformation: clientInfo,
      refreshToken: tokens.refresh_token,
    });

    const stored: StoredTokens = {
      ...newTokens,
      // Preserve refresh token if the server didn't issue a new one
      refresh_token: newTokens.refresh_token ?? tokens.refresh_token,
      obtained_at: Date.now(),
    };
    await writeTokens(stored);
    return stored.access_token;
  } catch (err) {
    captureServerError(err, { route: "calendly-mcp", phase: "token-refresh" });
    return null;
  } finally {
    await redis.del(REDIS_KEY_LOCK).catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// MCP tool call helper
// ---------------------------------------------------------------------------

/**
 * Opens a fresh MCP connection, calls a single tool, and disconnects.
 * Each invocation is independent — suitable for Vercel serverless.
 * An AbortController enforces a hard timeout so a hung MCP server
 * never blocks the chat response stream.
 */
async function callCalendlyMCP(
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown | null> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) return null;

  // Abort any in-flight HTTP requests if the MCP server hangs.
  const abort = new AbortController();
  const timeoutId = setTimeout(() => abort.abort(new Error(`Calendly MCP timeout after ${MCP_TIMEOUT_MS}ms`)), MCP_TIMEOUT_MS);

  const transport = new StreamableHTTPClientTransport(
    new URL(CALENDLY_MCP_URL),
    {
      requestInit: {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: abort.signal,
      },
    }
  );

  const client = new Client(
    { name: "dimeglio-dev-guillermo", version: "1.0.0" },
    { capabilities: {} }
  );

  try {
    await client.connect(transport);
    const result = await client.callTool({ name: toolName, arguments: args });

    if (result.isError) {
      console.error(`[Calendly MCP] Tool ${toolName} returned error:`, result.content);
      return null;
    }

    // Extract text content from result — cast content to the expected shape
    const content = result.content as Array<{ type: string; text?: string }>;
    const textParts = content
      .filter((c): c is { type: "text"; text: string } => c.type === "text" && typeof c.text === "string")
      .map((c) => c.text);

    if (textParts.length === 0) return null;

    // Try parsing as JSON (most Calendly tools return JSON)
    try {
      return JSON.parse(textParts.join(""));
    } catch {
      return textParts.join("");
    }
  } catch (err) {
    captureServerError(err, { route: "calendly-mcp", phase: "tool-call", toolName });
    return null;
  } finally {
    clearTimeout(timeoutId);
    try {
      await client.close();
    } catch {
      // Transport may already be closed
    }
  }
}

// ---------------------------------------------------------------------------
// Public: fetch available time slots
// ---------------------------------------------------------------------------

export interface AvailabilitySlot {
  startTime: string; // ISO 8601
}

export async function fetchAvailableSlots(): Promise<AvailabilitySlot[] | null> {
  const eventTypeUri = process.env.CALENDLY_EVENT_TYPE_URI;
  if (!eventTypeUri) return null;

  // Request a 7-day window (Calendly max). Start 5 minutes from now so the
  // timestamp is unambiguously in the future when the request arrives.
  const startDate = new Date(Date.now() + 5 * 60 * 1000);
  const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  const startTime = startDate.toISOString();
  const endTime = endDate.toISOString();

  const result = await callCalendlyMCP(
    "event_types-list_event_type_available_times",
    {
      event_type: eventTypeUri,
      start_time: startTime,
      end_time: endTime,
    }
  );

  if (!result || typeof result !== "object") return null;

  // Calendly returns { collection: [{ status: "available", start_time: "...", invitees_remaining: N }] }
  const data = result as {
    collection?: Array<{
      status: string;
      start_time: string;
      invitees_remaining?: number;
    }>;
  };

  if (!data.collection || !Array.isArray(data.collection)) return null;

  return data.collection
    .filter((slot) => slot.status === "available")
    .map((slot) => ({ startTime: slot.start_time }));
}

// ---------------------------------------------------------------------------
// Public: create single-use scheduling link
// ---------------------------------------------------------------------------

export async function createSchedulingLink(): Promise<string | null> {
  const eventTypeUri = process.env.CALENDLY_EVENT_TYPE_URI;
  if (!eventTypeUri) return null;

  const result = await callCalendlyMCP(
    "scheduling_links-create_single_use_scheduling_link",
    {
      create_scheduling_link_request: {
        max_event_count: 1,
        owner: eventTypeUri,
        owner_type: "EventType",
      },
    }
  );

  if (!result || typeof result !== "object") return null;

  const data = result as {
    resource?: { booking_url?: string };
    booking_url?: string;
  };

  return data.resource?.booking_url ?? data.booking_url ?? null;
}

// ---------------------------------------------------------------------------
// Public: group raw slots into DayGroup[] for the AvailabilityPicker widget
// ---------------------------------------------------------------------------

export interface DayGroup {
  date: string;  // YYYY-MM-DD
  label: string; // "Mon, Apr 21"
  slots: AvailabilitySlot[];
}

export function groupSlotsByDay(
  slots: AvailabilitySlot[],
  timezone: string
): DayGroup[] {
  const dayMap = new Map<string, AvailabilitySlot[]>();

  for (const slot of slots) {
    const dt = new Date(slot.startTime);
    // Format date in user's timezone
    const dateStr = dt.toLocaleDateString("en-CA", { timeZone: timezone }); // YYYY-MM-DD
    if (!dayMap.has(dateStr)) {
      dayMap.set(dateStr, []);
    }
    dayMap.get(dateStr)!.push(slot);
  }

  // Sort days chronologically
  const sortedDays = [...dayMap.entries()].sort(([a], [b]) => a.localeCompare(b));

  return sortedDays.map(([date, daySlots]) => {
    const dt = new Date(date + "T12:00:00"); // noon to avoid timezone edge cases
    const label = dt.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: timezone,
    });
    return {
      date,
      label,
      slots: daySlots.sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      ),
    };
  });
}
