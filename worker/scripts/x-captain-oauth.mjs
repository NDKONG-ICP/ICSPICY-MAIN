#!/usr/bin/env node
/**
 * One-time OAuth 2.0 PKCE flow for Captain X account.
 *
 * X developer portal → User authentication → Callback URL must EXACTLY match
 * X_CAPTAIN_OAUTH_REDIRECT (default http://127.0.0.1:8787/callback).
 *
 * Usage:
 *   export X_CAPTAIN_CLIENT_ID=...
 *   export X_CAPTAIN_CLIENT_SECRET=...   # confidential apps
 *   node scripts/x-captain-oauth.mjs
 *
 * If your X app uses localhost instead of 127.0.0.1:
 *   export X_CAPTAIN_OAUTH_REDIRECT=http://localhost:8787/callback
 */
import "dotenv/config";
import { createServer } from "http";
import { randomBytes, createHash } from "crypto";

const CLIENT_ID =
  process.argv.find((a) => a.startsWith("--client-id="))?.split("=")[1] ||
  process.env.X_CAPTAIN_CLIENT_ID?.trim();
const CLIENT_SECRET = process.env.X_CAPTAIN_CLIENT_SECRET?.trim() || "";
const REDIRECT =
  process.argv.find((a) => a.startsWith("--redirect="))?.split("=")[1] ||
  process.env.X_CAPTAIN_OAUTH_REDIRECT?.trim() ||
  "http://127.0.0.1:8787/callback";

const redirectUrl = new URL(REDIRECT);
const PORT = Number(redirectUrl.port || 8787);
const CALLBACK_PATH = redirectUrl.pathname.replace(/\/$/, "") || "/callback";

const SCOPES = ["tweet.read", "tweet.write", "users.read", "offline.access"].join(
  " ",
);

if (!CLIENT_ID) {
  console.error("Set X_CAPTAIN_CLIENT_ID or --client-id=");
  process.exit(1);
}

function b64url(buf) {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

const verifier = b64url(randomBytes(32));
const challenge = b64url(createHash("sha256").update(verifier).digest());

const authUrl = new URL("https://twitter.com/i/oauth2/authorize");
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("client_id", CLIENT_ID);
authUrl.searchParams.set("redirect_uri", REDIRECT);
authUrl.searchParams.set("scope", SCOPES);
authUrl.searchParams.set("state", "captain");
authUrl.searchParams.set("code_challenge", challenge);
authUrl.searchParams.set("code_challenge_method", "S256");

console.log("\n=== X Captain OAuth ===");
console.log(`Callback URL (must match X app settings EXACTLY):\n  ${REDIRECT}\n`);
console.log("Open in browser (log in as Captain Capsaicin):\n");
console.log(authUrl.toString());
console.log(`\nListening on ${redirectUrl.hostname}:${PORT}${CALLBACK_PATH} …\n`);

async function exchangeCode(code, res) {
  const body = new URLSearchParams({
    code,
    grant_type: "authorization_code",
    redirect_uri: REDIRECT,
    code_verifier: verifier,
  });
  const headers = { "Content-Type": "application/x-www-form-urlencoded" };
  if (CLIENT_SECRET) {
    headers.Authorization = `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")}`;
  }

  const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers,
    body,
  });
  const data = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok) {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end(`Token error: ${JSON.stringify(data)}`);
    console.error("Token exchange failed:", data);
    return false;
  }
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(
    "<h1>Success</h1><p>Tokens printed in your terminal. You can close this tab.</p>",
  );
  console.log("\n--- Store in agent_hub secrets ---\n");
  console.log(`x_captain_client_id=${CLIENT_ID}`);
  if (CLIENT_SECRET) console.log(`x_captain_client_secret=${CLIENT_SECRET}`);
  console.log(`x_captain_access_token=${data.access_token}`);
  if (data.refresh_token) {
    console.log(`x_captain_refresh_token=${data.refresh_token}`);
  }
  console.log("\n---\n");
  return true;
}

const server = createServer(async (req, res) => {
  const rawUrl = req.url ?? "/";
  const pathname = rawUrl.split("?")[0].replace(/\/$/, "") || "/";
  console.log(`[oauth] ${req.method} ${rawUrl}`);

  if (pathname === "/" || pathname === "") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      "<p>OAuth listener is running. Finish authorization on X — you should land on /callback.</p>",
    );
    return;
  }

  const isCallback =
    pathname === CALLBACK_PATH ||
    pathname === "/callback" ||
    pathname.endsWith("/callback");

  if (!isCallback) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end(`not found (${pathname})`);
    return;
  }

  const u = new URL(rawUrl, REDIRECT);
  const err = u.searchParams.get("error");
  const errDesc = u.searchParams.get("error_description");
  if (err) {
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end(`X error: ${err} ${errDesc ?? ""}`);
    console.error("X OAuth error:", err, errDesc);
    return;
  }

  const code = u.searchParams.get("code");
  if (!code) {
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end("missing code — check terminal and X app callback URL");
    return;
  }

  const ok = await exchangeCode(code, res);
  server.close();
  process.exit(ok ? 0 : 1);
});

server.on("error", (err) => {
  console.error(
    `[oauth] Could not listen on ${redirectUrl.hostname}:${PORT}: ${err.message}`,
  );
  console.error(
    "If port in use, stop the other process or set X_CAPTAIN_OAUTH_REDIRECT to another port.",
  );
  process.exit(1);
});

const host = redirectUrl.hostname === "localhost" ? "127.0.0.1" : redirectUrl.hostname;
server.listen(PORT, host === "127.0.0.1" ? "127.0.0.1" : host);
