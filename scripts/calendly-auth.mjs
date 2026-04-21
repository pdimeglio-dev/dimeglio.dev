#!/usr/bin/env node

/**
 * Calendly MCP OAuth Setup
 *
 * One-time interactive script that authorises Pablo's Calendly account
 * for the Guillermo chat agent. Stores OAuth tokens in Upstash Redis
 * so both local dev and Vercel production can access them.
 *
 * Usage:
 *   npm run calendly-auth
 *
 * Prerequisites:
 *   - Upstash Redis env vars in .env.local (UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN)
 *   - A Calendly account with at least one event type
 *
 * What it does:
 *   1. Discovers Calendly's OAuth server metadata
 *   2. Registers a public client via Dynamic Client Registration (DCR)
 *   3. Opens the browser for authorization (PKCE S256)
 *   4. Exchanges the auth code for access + refresh tokens
 *   5. Stores tokens + client info in Redis
 */

import { config } from "dotenv";
config({ path: ".env.local" });
import http from "node:http";
import { execSync } from "node:child_process";
import crypto from "node:crypto";

// ---------------------------------------------------------------------------
// Redis client (minimal REST wrapper — avoid importing @upstash/redis in ESM)
// ---------------------------------------------------------------------------

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!REDIS_URL || !REDIS_TOKEN) {
  console.error("❌ Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN in .env.local");
  process.exit(1);
}

async function redisSet(key, value) {
  const res = await fetch(`${REDIS_URL}/set/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(value),
  });
  if (!res.ok) throw new Error(`Redis SET failed: ${res.status} ${await res.text()}`);
}

// ---------------------------------------------------------------------------
// PKCE helpers
// ---------------------------------------------------------------------------

function base64url(buffer) {
  return Buffer.from(buffer)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function generateCodeVerifier() {
  return base64url(crypto.randomBytes(32));
}

async function generateCodeChallenge(verifier) {
  const digest = crypto.createHash("sha256").update(verifier).digest();
  return base64url(digest);
}

// ---------------------------------------------------------------------------
// OAuth discovery
// ---------------------------------------------------------------------------

const CALENDLY_MCP_URL = "https://mcp.calendly.com";
const REDIRECT_URI = "http://localhost:8549/callback";
const SCOPES = "mcp:scheduling:read mcp:scheduling:write";

async function discoverMetadata() {
  console.log("🔍 Discovering OAuth server metadata...");

  // Step 1: Protected resource metadata
  const prRes = await fetch(`${CALENDLY_MCP_URL}/.well-known/oauth-protected-resource`);
  if (!prRes.ok) throw new Error(`Protected resource discovery failed: ${prRes.status}`);
  const protectedResource = await prRes.json();
  console.log(`   Resource: ${protectedResource.resource}`);

  // Step 2: Authorization server URL (strip trailing slash)
  const rawAuthServerUrl =
    protectedResource.authorization_servers?.[0] || "https://auth.calendly.com";
  const authServerUrl = String(rawAuthServerUrl).replace(/\/$/, "");
  console.log(`   Auth server: ${authServerUrl}`);

  // Step 3: Authorization server metadata — try both well-known endpoints
  let metadata;
  for (const wellKnown of [
    `${authServerUrl}/.well-known/oauth-authorization-server`,
    `${authServerUrl}/.well-known/openid-configuration`,
  ]) {
    const asRes = await fetch(wellKnown);
    if (asRes.ok) {
      metadata = await asRes.json();
      console.log(`   Discovered via: ${wellKnown}`);
      break;
    }
  }
  if (!metadata) throw new Error(`Auth server discovery failed — tried both well-known endpoints`);
  console.log(`   Authorization endpoint: ${metadata.authorization_endpoint}`);
  console.log(`   Token endpoint: ${metadata.token_endpoint}`);
  console.log(`   Registration endpoint: ${metadata.registration_endpoint}`);

  return { authServerUrl, metadata, protectedResource };
}

// ---------------------------------------------------------------------------
// Dynamic Client Registration
// ---------------------------------------------------------------------------

async function registerClient(metadata) {
  console.log("\n📝 Registering client via DCR...");

  const registrationEndpoint = metadata.registration_endpoint;
  if (!registrationEndpoint) {
    throw new Error("No registration_endpoint in metadata — DCR not supported");
  }

  const clientMetadata = {
    client_name: "dimeglio-dev Guillermo Agent",
    redirect_uris: [REDIRECT_URI],
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    scope: SCOPES,
    token_endpoint_auth_method: "none", // Public client (no secret)
  };

  const res = await fetch(registrationEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(clientMetadata),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`DCR failed: ${res.status} ${body}`);
  }

  const clientInfo = await res.json();
  console.log(`   client_id: ${clientInfo.client_id}`);

  return clientInfo;
}

// ---------------------------------------------------------------------------
// Authorization flow
// ---------------------------------------------------------------------------

async function authorize(metadata, clientInfo) {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientInfo.client_id,
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state: crypto.randomUUID(),
  });

  // If the metadata has a resource field, include it
  const authUrl = `${metadata.authorization_endpoint}?${params}`;

  console.log("\n🌐 Opening browser for authorization...");
  console.log(`   URL: ${authUrl}\n`);

  // Wait for the callback
  const authCode = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://localhost:8549`);
      if (url.pathname !== "/callback") {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");

      if (error) {
        res.writeHead(400);
        res.end(`Authorization error: ${error} — ${url.searchParams.get("error_description") || ""}`);
        server.close();
        reject(new Error(`Authorization denied: ${error}`));
        return;
      }

      if (!code) {
        res.writeHead(400);
        res.end("No authorization code received");
        server.close();
        reject(new Error("No authorization code in callback"));
        return;
      }

      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(`
        <html><body style="font-family: system-ui; text-align: center; padding: 60px;">
          <h2>Authorization successful!</h2>
          <p>You can close this tab and return to the terminal.</p>
        </body></html>
      `);
      server.close();
      resolve(code);
    });

    server.listen(8549, () => {
      console.log("   Listening for callback on http://localhost:8549/callback");
      // Open browser
      try {
        const platform = process.platform;
        if (platform === "darwin") execSync(`open "${authUrl}"`);
        else if (platform === "linux") execSync(`xdg-open "${authUrl}"`);
        else if (platform === "win32") execSync(`start "" "${authUrl}"`);
        else console.log(`   Please open this URL manually: ${authUrl}`);
      } catch {
        console.log(`   Could not open browser. Please visit: ${authUrl}`);
      }
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      server.close();
      reject(new Error("Authorization timed out after 5 minutes"));
    }, 5 * 60 * 1000);
  });

  return { authCode, codeVerifier };
}

// ---------------------------------------------------------------------------
// Token exchange
// ---------------------------------------------------------------------------

async function exchangeToken(metadata, clientInfo, authCode, codeVerifier) {
  console.log("\n🔑 Exchanging authorization code for tokens...");

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientInfo.client_id,
    code: authCode,
    redirect_uri: REDIRECT_URI,
    code_verifier: codeVerifier,
  });

  const res = await fetch(metadata.token_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${errBody}`);
  }

  const tokens = await res.json();
  console.log(`   access_token: ${tokens.access_token?.slice(0, 20)}...`);
  console.log(`   refresh_token: ${tokens.refresh_token ? "present" : "not issued"}`);
  console.log(`   expires_in: ${tokens.expires_in}s`);

  return tokens;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("🗓️  Calendly MCP OAuth Setup\n");

  try {
    const { metadata } = await discoverMetadata();
    const clientInfo = await registerClient(metadata);
    const { authCode, codeVerifier } = await authorize(metadata, clientInfo);
    const tokens = await exchangeToken(metadata, clientInfo, authCode, codeVerifier);

    // Store in Redis
    console.log("\n💾 Saving to Upstash Redis...");

    const storedTokens = {
      ...tokens,
      obtained_at: Date.now(),
    };

    await redisSet("calendly:tokens", storedTokens);
    await redisSet("calendly:client_info", {
      client_id: clientInfo.client_id,
      client_secret: clientInfo.client_secret,
      client_id_issued_at: clientInfo.client_id_issued_at,
      client_secret_expires_at: clientInfo.client_secret_expires_at,
    });

    console.log("   ✅ calendly:tokens saved");
    console.log("   ✅ calendly:client_info saved");

    // List event types via MCP (the token only has mcp:scheduling scopes, not REST scopes)
    console.log("\n📋 Fetching your event types via MCP...");
    try {
      const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
      const { StreamableHTTPClientTransport } = await import("@modelcontextprotocol/sdk/client/streamableHttp.js");

      const transport = new StreamableHTTPClientTransport(
        new URL("https://mcp.calendly.com"),
        { requestInit: { headers: { Authorization: `Bearer ${tokens.access_token}` } } }
      );
      const client = new Client({ name: "calendly-auth-setup", version: "1.0.0" }, { capabilities: {} });
      await client.connect(transport);

      // Get current user URI first — list_event_types requires it
      const meResult = await client.callTool({ name: "users-get_current_user", arguments: {} });
      const meText = meResult.content?.filter(c => c.type === "text").map(c => c.text).join("");
      const me = JSON.parse(meText);
      const userUri = me.resource?.uri;

      const result = await client.callTool({ name: "event_types-list_event_types", arguments: { user: userUri } });
      await client.close();

      const text = result.content
        ?.filter(c => c.type === "text")
        .map(c => c.text)
        .join("");
      const data = JSON.parse(text);
      const types = data.collection ?? [];

      if (types.length === 0) {
        console.log("   (no event types found — create one in Calendly first)");
      } else {
        console.log("\n   Add one of these to .env.local as CALENDLY_EVENT_TYPE_URI:\n");
        for (const et of types) {
          console.log(`   Name:  ${et.name}`);
          console.log(`   URI:   ${et.uri}`);
          console.log(`   URL:   ${et.scheduling_url}`);
          console.log();
        }
      }
    } catch (e) {
      console.log(`   (could not fetch event types via MCP: ${e.message})`);
      console.log(`   Check manually: https://api.calendly.com/event_types (requires a Personal Access Token)`);
    }

    console.log("🎉 Done! Guillermo can now schedule calls via Calendly MCP.");
    console.log("   Tokens are shared between local dev and Vercel (via Redis).");
    console.log("   Re-run this script if tokens are ever revoked.\n");
  } catch (err) {
    console.error(`\n❌ ${err.message}`);
    process.exit(1);
  }
}

main();
