import {validateEventConfig,currentJstEventId} from "./config.js";
import {DropSettings} from "./settings.js";
const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
const TIERS = ["secret", "rare", "common"];

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...headers } });
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
      this.sql.exec(`CREATE TABLE IF NOT EXISTS managed_config (id INTEGER PRIMARY KEY, operation_id TEXT NOT NULL, config TEXT NOT NULL)`);
      this.sql.exec(`CREATE TABLE IF NOT EXISTS draws (
        request_id TEXT PRIMARY KEY, user_id TEXT NOT NULL UNIQUE, event_id INTEGER NOT NULL,
        rarity TEXT NOT NULL, drawn_at TEXT NOT NULL
      )`);
    });
  }

  async fetch(request) {
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    const input = await request.json();
    const {config,requestId,userId}=input;
    let safeConfig = validateEventConfig(config);
    const path=new URL(request.url).pathname;
    if(path==="/status"||path==="/configure"){
      try{return json(this.ctx.storage.transactionSync(()=>{
        const pool=[...this.sql.exec("SELECT * FROM pool WHERE event_id = ?",safeConfig.eventId)][0];
        const managed=[...this.sql.exec("SELECT * FROM managed_config WHERE id=1")][0];
        if(path==="/configure"){
          if(typeof input.operationId!=="string"||! /^[0-9a-f-]{36}$/i.test(input.operationId))throw Error("INVALID_CONFIG");
          if(managed?.operation_id!==input.operationId){
            const drawn=pool?{secret:pool.secret_initial-pool.secret_remaining,rare:pool.rare_initial-pool.rare_remaining,common:pool.common_initial-pool.common_remaining}:{secret:0,rare:0,common:0};
            if(TIERS.some(t=>safeConfig.inventory[t]<drawn[t]))throw Error("BELOW_DRAWN");
            const remaining=safeConfig.totalDraws-TIERS.reduce((n,t)=>n+drawn[t],0),now=new Date().toISOString();
            this.sql.exec(`INSERT INTO pool VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(event_id) DO UPDATE SET initial_total=excluded.initial_total,remaining_total=excluded.remaining_total,
              secret_initial=excluded.secret_initial,secret_remaining=excluded.secret_remaining,rare_initial=excluded.rare_initial,rare_remaining=excluded.rare_remaining,
              common_initial=excluded.common_initial,common_remaining=excluded.common_remaining,state=excluded.state,updated_at=excluded.updated_at`,
              safeConfig.eventId,safeConfig.totalDraws,remaining,safeConfig.inventory.secret,safeConfig.inventory.secret-drawn.secret,safeConfig.inventory.rare,safeConfig.inventory.rare-drawn.rare,safeConfig.inventory.common,safeConfig.inventory.common-drawn.common,remaining===0?"exhausted":"active",now,now);
            this.sql.exec("INSERT INTO managed_config VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET operation_id=excluded.operation_id,config=excluded.config",input.operationId,JSON.stringify(safeConfig));
          }
        }
        const active=[...this.sql.exec("SELECT * FROM pool WHERE event_id = ?",safeConfig.eventId)][0];
        return {eventId:safeConfig.eventId,totalDraws:active?.initial_total??safeConfig.totalDraws,
          inventory:active?{secret:active.secret_initial,rare:active.rare_initial,common:active.common_initial}:safeConfig.inventory,
          remaining:active?{secret:active.secret_remaining,rare:active.rare_remaining,common:active.common_remaining,total:active.remaining_total}:{...safeConfig.inventory,total:safeConfig.totalDraws},
          drawn:active?{secret:active.secret_initial-active.secret_remaining,rare:active.rare_initial-active.rare_remaining,common:active.common_initial-active.common_remaining,total:active.initial_total-active.remaining_total}:{secret:0,rare:0,common:0,total:0},initialized:Boolean(active)};
      }));}catch(e){return json({error:e.message==="BELOW_DRAWN"?"counts_below_drawn":"invalid_config"},e.message==="BELOW_DRAWN"?409:400);}
    }
    const managed=[...this.sql.exec("SELECT * FROM managed_config WHERE id=1")][0];
    if(managed&&JSON.parse(managed.config).eventId!==safeConfig.eventId)return json({error:"event_mismatch"},409);
    if(managed)safeConfig=validateEventConfig(JSON.parse(managed.config));
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

async function adminAuthorized(request,env){
  const key=env.DROP_ADMIN_TOKEN;
  if(typeof key!=="string"||key.length<32)return false;
  const actual=request.headers.get("authorization")??"";
  if(actual.length>1024)return false;
  const hash=async value=>new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)));
  const [a,b]=await Promise.all([hash(actual),hash("Bearer "+key)]);let difference=0;for(let i=0;i<a.length;i++)difference|=a[i]^b[i];return difference===0;
}
async function adminBody(request){
  if(Number(request.headers.get("content-length"))>2048)throw Error("body_too_large");
  const reader=request.body?.getReader();if(!reader)throw Error("invalid_json");let size=0;const chunks=[];
  try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>2048){await reader.cancel();throw Error("body_too_large");}chunks.push(part.value);}}finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}return JSON.parse(new TextDecoder().decode(bytes));
}
function settings(env){return env.DROP_SETTINGS.get(env.DROP_SETTINGS.idFromName("settings"));}
export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(url.pathname==="/api/admin/config"){
   if(!await adminAuthorized(request,env))return json({error:"unauthorized"},401,{"cache-control":"no-store"});
   if(!["GET","POST"].includes(request.method))return json({error:"method_not_allowed"},405);
   if(!env.DROP_SETTINGS)return json({error:"settings_unavailable"},503);
   try{
    const body=request.method==="POST"?await adminBody(request):{};
    return await settings(env).fetch("https://settings.internal/"+(request.method==="POST"?"update":"state"),{method:"POST",body:JSON.stringify(body)});
   }catch(e){return json({error:e.message==="body_too_large"?"body_too_large":e instanceof SyntaxError?"invalid_json":"settings_apply_unknown"},e.message==="body_too_large"?413:e instanceof SyntaxError?400:503,{"cache-control":"no-store"});}
  }
  const cors=corsHeaders(request,env);
  if(!cors)return json({error:"origin_not_allowed"},403);
  if(request.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
  try{
   if(url.pathname==="/api/session"&&request.method==="POST"){
    if(!env.SESSION_SECRET)return json({error:"server_not_configured"},503,cors);
    return json({token:await createParticipantToken(env.SESSION_SECRET)},201,cors);
   }
   if(!env.DROP_SETTINGS)return json({error:"settings_unavailable"},503,cors);
   if(url.pathname==="/api/event"&&request.method==="POST"){
    const r=await settings(env).fetch("https://settings.internal/state",{method:"POST",body:"{}"});
    if(!r.ok)return json({error:"settings_unavailable"},503,cors);
    const data=await r.json();return json({eventId:data.eventId,totalDraws:data.current.totalDraws,inventory:data.current.inventory,configVersion:3,adminConfigured:typeof env.DROP_ADMIN_TOKEN==="string"&&env.DROP_ADMIN_TOKEN.length>=32},200,{...cors,"cache-control":"no-store"});
   }
   if(url.pathname==="/api/draw"&&request.method==="POST"){
    if(!env.SESSION_SECRET)return json({error:"server_not_configured"},503,cors);
    const userId=await participantIdFromToken(request.headers.get("authorization")?.replace(/^Bearer /,""),env.SESSION_SECRET);
    if(!userId)return json({error:"unauthorized"},401,cors);
    const body=await request.json();if(!/^[0-9a-f-]{36}$/i.test(body.requestId))return json({error:"invalid_request"},400,cors);
    const r=await settings(env).fetch("https://settings.internal/draw",{method:"POST",body:JSON.stringify({requestId:body.requestId,userId})});
    return new Response(r.body,{status:r.status,headers:{...JSON_HEADERS,...cors,"cache-control":"no-store"}});
   }
   return json({error:"not_found"},404,cors);
  }catch{return json({error:"internal_error"},500,{...cors,"cache-control":"no-store"});}
 }
};
export {validateEventConfig,randomInteger,currentJstEventId,DropSettings};
