/**
 * Public holder studio API. The MiniRouter key stays in this process.
 *
 *   DROP_STUDIO_PORT=8787 node src/drop-studio-server.js
 */

import "dotenv/config";
import { createServer } from "node:http";
import {
  allowanceFor,
  assertAdminToken,
  createChallenge,
  generateForHolder,
  publicStatus,
  setSiteCap,
} from "./lib/hedera-drop-studio.js";

const PORT = Number(process.env.DROP_STUDIO_PORT || 8787);
const ALLOW_ORIGIN = new Set(
  (process.env.DROP_STUDIO_ORIGINS ||
    "https://www.icspicy.app,https://icspicy.app,https://7rukv-hqaaa-aaaao-ba6ma-cai.icp0.io,http://localhost:5173,http://127.0.0.1:5173")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean),
);

function send(res, status, body, origin) {
  const headers = {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,authorization",
    "cache-control": "no-store",
  };
  if (origin && ALLOW_ORIGIN.has(origin)) {
    headers["access-control-allow-origin"] = origin;
    headers.vary = "Origin";
  }
  res.writeHead(status, headers);
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 32_000) throw new Error("Request is too large");
    chunks.push(chunk);
  }
  if (size === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export function startDropStudioServer() {
  const server = createServer(async (req, res) => {
    const origin = req.headers.origin || "";
    if (req.method === "OPTIONS") {
      send(res, 204, {}, origin);
      return;
    }
    const url = new URL(req.url || "/", "http://127.0.0.1");
    try {
      if (req.method === "GET" && url.pathname === "/v1/drop-studio/status") {
        send(res, 200, await publicStatus(), origin);
        return;
      }
      if (req.method === "POST" && url.pathname === "/v1/drop-studio/allowance") {
        const body = await readJson(req);
        send(res, 200, await allowanceFor(body.accountId), origin);
        return;
      }
      if (req.method === "POST" && url.pathname === "/v1/drop-studio/challenge") {
        const body = await readJson(req);
        send(res, 200, createChallenge(body.accountId), origin);
        return;
      }
      if (req.method === "POST" && url.pathname === "/v1/drop-studio/generate") {
        const body = await readJson(req);
        send(
          res,
          200,
          await generateForHolder({
            accountId: body.accountId,
            challengeId: body.challengeId,
            signature: body.signature,
            style: body.style,
            subject: body.subject,
            promptMode: body.promptMode,
          }),
          origin,
        );
        return;
      }
      if (req.method === "POST" && url.pathname === "/v1/drop-studio/ceiling") {
        if (!assertAdminToken(req.headers.authorization)) {
          send(res, 401, { error: "Admin token required" }, origin);
          return;
        }
        const body = await readJson(req);
        send(res, 200, await setSiteCap(body.siteCap), origin);
        return;
      }
      send(res, 404, { error: "Not found" }, origin);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Studio request failed";
      send(res, 400, { error: message }, origin);
    }
  });
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[drop-studio] listening on ${PORT}`);
  });
  return server;
}

const isDirect = process.argv[1] && process.argv[1].endsWith("drop-studio-server.js");
if (isDirect) startDropStudioServer();
