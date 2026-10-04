const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
const TIERS = ["secret", "rare", "common"];

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...headers } });
}

function validateEventConfig(value) {
  if (!value || !Number.isSafeInteger(value.eventId) || value.eventId < 1) throw new Error("Invalid eventId");
  if (!Number.isSafeInteger(value.totalDraws) || value.totalDraws < 1) throw new Error("Invalid totalDraws");
  const inventory = {};
  for (const tier of TIERS) {
    if (!Number.isSafeInteger(value.inventory?.[tier]) || value.inventory[tier] < 0) throw new Error(`Invalid ${tier} inventory`);
    inventory[tier] = value.inventory[tier];
  }
  if (TIERS.reduce((sum, tier) => sum + inventory[tier], 0) !== value.totalDraws) throw new Error("Inventory must equal totalDraws");
  return { eventId: value.eventId, totalDraws: value.totalDraws, inventory };
}

function currentJstEventId() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return Number(`${values.year}${values.month}${values.day}`);
}

function randomInteger(maximum) {
  const limit = Math.floor(0x100000000 / maximum) * maximum;
  const values = new Uint32Array(1);
  do crypto.getRandomValues(values); while (values[0] >= limit);
  return values[0] % maximum;
}

function base64url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function decodeBase64url(value) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  return Uint8Array.from(atob(normalized), character => character.charCodeAt(0));
}

async function signingKey(secret) {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

async function createParticipantToken(secret) {
  const payload = base64url(new TextEncoder().encode(JSON.stringify({ id: crypto.randomUUID(), issuedAt: Date.now() })));
  const signature = await crypto.subtle.sign("HMAC", await signingKey(secret), new TextEncoder().encode(payload));
  return `${payload}.${base64url(new Uint8Array(signature))}`;
}

async function participantIdFromToken(token, secret) {
  const [payload, signature] = String(token || "").split(".");
  if (!payload || !signature) return null;
  const valid = await crypto.subtle.verify("HMAC", await signingKey(secret), decodeBase64url(signature), new TextEncoder().encode(payload));
  if (!valid) return null;
  const decoded = JSON.parse(new TextDecoder().decode(decodeBase64url(payload)));
  return typeof decoded.id === "string" ? decoded.id : null;
}

function corsHeaders(request, env) {
  const origin = request.headers.get("origin") || "";
  const allowed = String(env.ALLOWED_ORIGINS || "").split(",").map(value => value.trim());
  return allowed.includes(origin) ? {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "POST,OPTIONS",
    "access-control-allow-headers": "content-type,authorization",
    "vary": "Origin"
  } : null;
}

async function loadEventConfig(env) {
  const response = await fetch(env.CONFIG_URL, { cf: { cacheTtl: 15, cacheEverything: true } });
  if (!response.ok) throw new Error(`Config fetch failed: ${response.status}`);
  const config = validateEventConfig(await response.json());
  return { ...config, eventId: currentJstEventId() };
}

export class EventPool {
  constructor(ctx) {
    this.ctx = ctx;
    this.sql = ctx.storage.sql;
    this.ctx.blockConcurrencyWhile(async () => {
      this.sql.exec(`CREATE TABLE IF NOT EXISTS pool (
        event_id INTEGER PRIMARY KEY, initial_total INTEGER NOT NULL, remaining_total INTEGER NOT NULL,
        secret_initial INTEGER NOT NULL, secret_remaining INTEGER NOT NULL,
        rare_initial INTEGER NOT NULL, rare_remaining INTEGER NOT NULL,
        common_initial INTEGER NOT NULL, common_remaining INTEGER NOT NULL,
        state TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      )`);
      this.sql.exec(`CREATE TABLE IF NOT EXISTS draws (
        request_id TEXT PRIMARY KEY, user_id TEXT NOT NULL UNIQUE, event_id INTEGER NOT NULL,
        rarity TEXT NOT NULL, drawn_at TEXT NOT NULL
      )`);
    });
  }

  async fetch(request) {
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    const { config, requestId, userId } = await request.json();
    const safeConfig = validateEventConfig(config);
    if (!/^[0-9a-f-]{36}$/i.test(requestId) || !/^[0-9a-f-]{36}$/i.test(userId)) return json({ error: "invalid_request" }, 400);
    try {
      const result = this.ctx.storage.transactionSync(() => {
        const now = new Date().toISOString();
        this.sql.exec(`INSERT OR IGNORE INTO pool VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
          safeConfig.eventId, safeConfig.totalDraws, safeConfig.totalDraws,
          safeConfig.inventory.secret, safeConfig.inventory.secret,
          safeConfig.inventory.rare, safeConfig.inventory.rare,
          safeConfig.inventory.common, safeConfig.inventory.common, now, now);

        const pool = [...this.sql.exec("SELECT * FROM pool WHERE event_id = ?", safeConfig.eventId)][0];
        if (!pool || pool.initial_total !== safeConfig.totalDraws || pool.secret_initial !== safeConfig.inventory.secret || pool.rare_initial !== safeConfig.inventory.rare || pool.common_initial !== safeConfig.inventory.common) {
          throw new Error("CONFIG_SNAPSHOT_MISMATCH");
        }

        const repeatedRequest = [...this.sql.exec("SELECT * FROM draws WHERE request_id = ?", requestId)][0];
        if (repeatedRequest && repeatedRequest.user_id !== userId) throw new Error("REQUEST_OWNER_MISMATCH");
        if (repeatedRequest) return { request_id: repeatedRequest.request_id, event_id: repeatedRequest.event_id, rarity: repeatedRequest.rarity, drawn_at: repeatedRequest.drawn_at, replayed: true, remainingTotal: pool.remaining_total };
        const previousDraw = [...this.sql.exec("SELECT * FROM draws WHERE user_id = ?", userId)][0];
        if (previousDraw) return { request_id: previousDraw.request_id, event_id: previousDraw.event_id, rarity: previousDraw.rarity, drawn_at: previousDraw.drawn_at, replayed: true, remainingTotal: pool.remaining_total };
        if (pool.state !== "active" || pool.remaining_total <= 0) throw new Error("POOL_EXHAUSTED");

        let cursor = randomInteger(pool.remaining_total);
        let rarity = "common";
        if (cursor < pool.secret_remaining) rarity = "secret";
        else if ((cursor -= pool.secret_remaining) < pool.rare_remaining) rarity = "rare";

        const column = `${rarity}_remaining`;
        const nextTotal = pool.remaining_total - 1;
        const nextState = nextTotal === 0 ? "exhausted" : "active";
        this.sql.exec(`UPDATE pool SET ${column} = ${column} - 1, remaining_total = remaining_total - 1, state = ?, updated_at = ? WHERE event_id = ? AND ${column} > 0 AND remaining_total > 0`, nextState, now, safeConfig.eventId);
        this.sql.exec("INSERT INTO draws VALUES (?, ?, ?, ?, ?)", requestId, userId, safeConfig.eventId, rarity, now);
        return { request_id: requestId, event_id: safeConfig.eventId, rarity, drawn_at: now, replayed: false, remainingTotal: nextTotal };
      });
      return json(result);
    } catch (error) {
      if (error.message === "POOL_EXHAUSTED") return json({ error: "pool_exhausted" }, 409);
      if (error.message === "CONFIG_SNAPSHOT_MISMATCH") return json({ error: "config_snapshot_mismatch" }, 409);
      if (error.message === "REQUEST_OWNER_MISMATCH") return json({ error: "request_owner_mismatch" }, 409);
      throw error;
    }
  }
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    if (!cors) return json({ error: "origin_not_allowed" }, 403);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    const url = new URL(request.url);

    try {
      if (url.pathname === "/api/session" && request.method === "POST") {
        if (!env.SESSION_SECRET) return json({ error: "server_not_configured" }, 503, cors);
        return json({ token: await createParticipantToken(env.SESSION_SECRET) }, 201, cors);
      }
      if (url.pathname === "/api/event" && request.method === "POST") {
        const config = await loadEventConfig(env);
        return json({ eventId: config.eventId, totalDraws: config.totalDraws }, 200, cors);
      }
      if (url.pathname === "/api/draw" && request.method === "POST") {
        if (!env.SESSION_SECRET) return json({ error: "server_not_configured" }, 503, cors);
        const userId = await participantIdFromToken(request.headers.get("authorization")?.replace(/^Bearer /, ""), env.SESSION_SECRET);
        if (!userId) return json({ error: "unauthorized" }, 401, cors);
        const body = await request.json();
        if (!/^[0-9a-f-]{36}$/i.test(body.requestId)) return json({ error: "invalid_request" }, 400, cors);
        const config = await loadEventConfig(env);
        const object = env.EVENT_POOLS.get(env.EVENT_POOLS.idFromName(String(config.eventId)));
        const response = await object.fetch("https://pool.internal/draw", { method: "POST", body: JSON.stringify({ config, requestId: body.requestId, userId }) });
        return new Response(response.body, { status: response.status, headers: { ...JSON_HEADERS, ...cors, "cache-control": "no-store" } });
      }
      return json({ error: "not_found" }, 404, cors);
    } catch (error) {
      console.error(error);
      return json({ error: "internal_error" }, 500, cors);
    }
  }
};

export { validateEventConfig, randomInteger, currentJstEventId };
