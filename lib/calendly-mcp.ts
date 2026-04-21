/**
 * Calendly Integration
 *
 * Fetches calendar availability and creates single-use scheduling links
 * via the Calendly REST API using a Personal Access Token.
 *
 * The OAuth/MCP token flow (stored in Redis via `npm run calendly-auth`)
 * uses mcp:scheduling:* scopes which are siloed from the REST API.
 * Until Guillermo moves to a dedicated long-running service where MCP
 * transport works reliably, the REST API + PAT is the production path.
 *
 * MCP client code is preserved below (unused) for the future migration.
 */

import { Client } from "@modelcontextprotocol/sdk/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { captureServerError } from "@/lib/posthog-server";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CALENDLY_API_BASE = "https://api.calendly.com";
const CALENDLY_MCP_URL = "https://mcp.calendly.com";

/** Hard timeout for REST API calls (ms). */
const API_TIMEOUT_MS = 8_000;

/** Hard timeout for a single MCP tool call (ms). */
const MCP_TIMEOUT_MS = 8_000;

// ---------------------------------------------------------------------------
// Public: feature flag
// ---------------------------------------------------------------------------

/**
 * Returns `true` when the Calendly integration has a chance of working:
 * a Personal Access Token and event type URI are configured.
 */
export function isCalendlyConfigured(): boolean {
  return !!(
    process.env.CALENDLY_API_TOKEN &&
    process.env.CALENDLY_EVENT_TYPE_URI
  );
}

// ---------------------------------------------------------------------------
// REST API helpers
// ---------------------------------------------------------------------------

async function calendlyFetch(
  path: string,
  options?: RequestInit
): Promise<Response> {
  const token = process.env.CALENDLY_API_TOKEN;
  if (!token) throw new Error("CALENDLY_API_TOKEN is not set");

  return fetch(`${CALENDLY_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
  });
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

  const params = new URLSearchParams({
    event_type: eventTypeUri,
    start_time: startDate.toISOString(),
    end_time: endDate.toISOString(),
  });

  try {
    const res = await calendlyFetch(`/event_type_available_times?${params}`);

    if (!res.ok) {
      console.error(`[Calendly] Available times API returned ${res.status}`);
      captureServerError(new Error(`Calendly API ${res.status}`), {
        route: "calendly",
        phase: "fetch-available-times",
      });
      return null;
    }

    // Calendly returns { collection: [{ status: "available", start_time: "...", invitees_remaining: N }] }
    const data = (await res.json()) as {
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
  } catch (err) {
    captureServerError(err, { route: "calendly", phase: "fetch-available-times" });
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public: create single-use scheduling link
// ---------------------------------------------------------------------------

export async function createSchedulingLink(): Promise<string | null> {
  const eventTypeUri = process.env.CALENDLY_EVENT_TYPE_URI;
  if (!eventTypeUri) return null;

  try {
    const res = await calendlyFetch("/scheduling_links", {
      method: "POST",
      body: JSON.stringify({
        max_event_count: 1,
        owner: eventTypeUri,
        owner_type: "EventType",
      }),
    });

    if (!res.ok) {
      console.error(`[Calendly] Scheduling link API returned ${res.status}`);
      captureServerError(new Error(`Calendly API ${res.status}`), {
        route: "calendly",
        phase: "create-scheduling-link",
      });
      return null;
    }

    const data = (await res.json()) as {
      resource?: { booking_url?: string };
      booking_url?: string;
    };

    return data.resource?.booking_url ?? data.booking_url ?? null;
  } catch (err) {
    captureServerError(err, { route: "calendly", phase: "create-scheduling-link" });
    return null;
  }
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

// ---------------------------------------------------------------------------
// MCP tool call helper (UNUSED — preserved for future dedicated service)
// ---------------------------------------------------------------------------
// The Calendly MCP server (mcp.calendly.com) uses StreamableHTTP transport.
// This works locally but hangs on Vercel serverless due to:
//   1. The SDK's StreamableHTTPClientTransport overwrites AbortSignal
//   2. SSE streams don't flush reliably through Vercel's network layer
//   3. MCP OAuth tokens (mcp:scheduling:*) are siloed from REST API scopes
//
// When Guillermo moves to a long-running service (Railway/Fly.io), swap
// fetchAvailableSlots/createSchedulingLink back to callCalendlyMCP().
// The OAuth tokens in Redis (via `npm run calendly-auth`) are still valid.
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function callCalendlyMCP(
  toolName: string,
  args: Record<string, unknown>,
  accessToken: string
): Promise<unknown | null> {
  const transport = new StreamableHTTPClientTransport(
    new URL(CALENDLY_MCP_URL),
    {
      requestInit: {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    }
  );

  const client = new Client(
    { name: "dimeglio-dev-guillermo", version: "1.0.0" },
    { capabilities: {} }
  );

  try {
    const result = await Promise.race([
      (async () => {
        await client.connect(transport);
        return client.callTool({ name: toolName, arguments: args });
      })(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Calendly MCP timeout after ${MCP_TIMEOUT_MS}ms`)),
          MCP_TIMEOUT_MS
        )
      ),
    ]);

    if (result.isError) {
      console.error(`[Calendly MCP] Tool ${toolName} returned error:`, result.content);
      return null;
    }

    const content = result.content as Array<{ type: string; text?: string }>;
    const textParts = content
      .filter((c): c is { type: "text"; text: string } => c.type === "text" && typeof c.text === "string")
      .map((c) => c.text);

    if (textParts.length === 0) return null;

    try {
      return JSON.parse(textParts.join(""));
    } catch {
      return textParts.join("");
    }
  } catch (err) {
    captureServerError(err, { route: "calendly-mcp", phase: "tool-call", toolName });
    return null;
  } finally {
    try {
      await client.close();
    } catch {
      // Transport may already be closed
    }
  }
}
