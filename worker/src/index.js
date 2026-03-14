/**
 * Cloudflare Worker — Expenses Tracker v2
 *
 * Routes:
 *   /auth/google           → start OAuth
 *   /auth/google/callback  → finish OAuth, set session cookie
 *   /auth/logout
 *   /auth/me
 *   /drive/webhook         → Google Drive push notification
 *   /api/pending           → GET unassigned receipts
 *   /api/assign            → POST assign receipt to trip → moves file in Drive
 *   /api/expenses          → GET/POST persisted expenses
 *   /api/subscribe         → POST register Drive webhook (called on login)
 *   /api/email-trip        → POST send trip expenses via Gmail
 *
 * Cron: renewWebhook() — runs daily, renews expiring Drive webhook
 */

const COOKIE          = "exp_session";
const SESSION_TTL     = 60 * 60 * 24 * 7;
const WEBHOOK_TTL     = 60 * 60 * 24 * 6;
const RECEIPTS_ROOT   = "Receipts";
const PENDING_FOLDER  = "Pending";           // /Receipts/Pending — phone drops here

export default {
  async fetch(request, env) {
    let response;
    try {
      response = await handleRequest(request, env);
    } catch (err) {
      response = new Response(JSON.stringify({ error: "internal", message: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    // Apply CORS to every response — no exceptions
    const origin = request.headers.get("Origin") || "https://expenses.funfairlabs.com";
    const h = new Headers(response.headers);
    h.set("Access-Control-Allow-Origin",      origin);
    h.set("Access-Control-Allow-Credentials", "true");
    h.set("Access-Control-Allow-Methods",     "GET, POST, OPTIONS");
    h.set("Access-Control-Allow-Headers",     "Content-Type");
    h.set("Vary",                             "Origin");
    return new Response(response.body, { status: response.status, headers: h });
  },

  async scheduled(event, env) {
    await renewWebhook(env);
    await pushoverDailyNudge(env);
  },
};

async function handleRequest(request, env) {
  const url  = new URL(request.url);
  const path = url.pathname;

  // Rate limit
  const ip  = request.headers.get("CF-Connecting-IP") || "x";
  const rk  = `rl_${ip}_${Math.floor(Date.now() / 60000)}`;
  const rct = parseInt(await env.KV.get(rk) || "0") + 1;
  await env.KV.put(rk, String(rct), { expirationTtl: 120 });
  if (rct > 120) return new Response("Too many requests", { status: 429 });

  if (request.method === "OPTIONS") return new Response(null, { status: 204 });

  if (path === "/auth/google")          return googleStart(request, env);
  if (path === "/auth/google/callback") return googleCallback(request, env);
  if (path === "/auth/logout")          return logout(request, env);
  if (path === "/auth/me")              return getMe(request, env);
  if (path === "/drive/webhook")        return driveWebhook(request, env);
  if (path === "/api/pending")          return getPending(request, env);
  if (path === "/api/assign")           return assignReceipt(request, env);
  if (path === "/api/expenses")         return handleExpenses(request, env);
  if (path === "/api/subscribe")        return subscribeWebhook(request, env);
  if (path === "/api/email-trip")       return emailTrip(request, env);
  if (path === "/api/delete-pending")   return deletePending(request, env);
  if (path === "/api/delete-expense")   return deleteExpense(request, env);

  return new Response("Not found", { status: 404 });
}

// ── Google OAuth ───────────────────────────────────────────────────────────

function googleStart(request, env) {
  const params = new URLSearchParams({
    client_id:     env.GOOGLE_CLIENT_ID,
    redirect_uri:  `${env.APP_URL}/auth/google/callback`,
    response_type: "code",
    scope: [
      "openid email profile",
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/gmail.send",
    ].join(" "),
    state:       crypto.randomUUID(),
    access_type: "offline",
    prompt:      "consent",
  });
  return Response.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`, 302);
}

async function googleCallback(request, env) {
  const code = new URL(request.url).searchParams.get("code");
  if (!code) return htmlRedirect(env.FRONTEND_URL + "?error=no_code");

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri:  `${env.APP_URL}/auth/google/callback`,
      grant_type:    "authorization_code",
      code,
    }),
  });
  const td = await tokenRes.json();
  if (!td.access_token) return htmlRedirect(env.FRONTEND_URL + "?error=token_failed");

  const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${td.access_token}` },
  });
  const user = await userRes.json();

  const session = {
    id:                 `g_${user.id}`,
    name:               user.name,
    email:              user.email,
    avatar:             user.picture,
    googleAccessToken:  td.access_token,
    googleRefreshToken: td.refresh_token || null,
    googleTokenExpiry:  Date.now() + (td.expires_in || 3600) * 1000,
  };

  const sid = crypto.randomUUID();
  await env.KV.put(`sess_${sid}`, JSON.stringify(session), { expirationTtl: SESSION_TTL });

  const res = Response.redirect(env.FRONTEND_URL + "?login=success", 302);
  const h   = new Headers(res.headers);
  h.set("Set-Cookie", `${COOKIE}=${sid}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=${SESSION_TTL}`);
  return new Response(res.body, { status: res.status, headers: h });
}

function logout(request, env) {
  const res = Response.redirect(env.FRONTEND_URL, 302);
  const h   = new Headers(res.headers);
  h.set("Set-Cookie", `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0`);
  return new Response(res.body, { status: res.status, headers: h });
}

// ── Session ────────────────────────────────────────────────────────────────

async function loadSession(request, env) {
  const cookie = request.headers.get("Cookie") || "";
  const m      = cookie.match(new RegExp(`${COOKIE}=([^;]+)`));
  if (!m) return { session: null, sid: null };
  const sid  = m[1];
  const data = await env.KV.get(`sess_${sid}`);
  return { session: data ? JSON.parse(data) : null, sid };
}

async function saveSession(env, sid, session) {
  await env.KV.put(`sess_${sid}`, JSON.stringify(session), { expirationTtl: SESSION_TTL });
}

async function getMe(request, env) {
  const { session } = await loadSession(request, env);
  if (!session) return ok({ error: "unauthenticated" }, 401);
  const { googleAccessToken, googleRefreshToken, ...safe } = session;
  return ok(safe);
}

async function freshToken(session, env, sid) {
  if (session.googleTokenExpiry && Date.now() < session.googleTokenExpiry - 120000)
    return session.googleAccessToken;
  if (!session.googleRefreshToken) return null;

  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      grant_type:    "refresh_token",
      refresh_token: session.googleRefreshToken,
    }),
  });
  const d = await r.json();
  if (!d.access_token) return null;

  session.googleAccessToken = d.access_token;
  session.googleTokenExpiry = Date.now() + (d.expires_in || 3600) * 1000;
  await saveSession(env, sid, session);
  return d.access_token;
}

// ── Drive helpers ──────────────────────────────────────────────────────────

async function driveList(token, q, fields = "files(id,name,mimeType,createdTime)") {
  const r = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=${encodeURIComponent(fields)}&pageSize=100`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return r.json();
}

async function driveGetOrCreate(token, name, parentId) {
  const q = `name="${name}" and mimeType="application/vnd.google-apps.folder" and "${parentId}" in parents and trashed=false`;
  const ex = await driveList(token, q, "files(id)");
  if (ex.files?.length) return ex.files[0].id;
  const r = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder", parents: [parentId] }),
  });
  return (await r.json()).id;
}

async function driveRootFolderId(token, name) {
  const q  = `name="${name}" and mimeType="application/vnd.google-apps.folder" and "root" in parents and trashed=false`;
  const ex = await driveList(token, q, "files(id)");
  if (ex.files?.length) return ex.files[0].id;
  const r = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder", parents: ["root"] }),
  });
  return (await r.json()).id;
}

async function driveMoveFile(token, fileId, newParentId, oldParentId) {
  const r = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${newParentId}&removeParents=${oldParentId}&fields=id,name,webViewLink`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }
  );
  return r.json();
}

async function driveDownloadBase64(token, fileId) {
  const r   = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${token}` } });
  const buf = await r.arrayBuffer();
  const b   = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s);
}

async function driveRenameFile(token, fileId, newName) {
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: newName }),
  });
}

// ── Webhook subscription ───────────────────────────────────────────────────

async function subscribeWebhook(request, env) {
  const { session, sid } = await loadSession(request, env);
  if (!session) return ok({ error: "unauthenticated" }, 401);

  const token = await freshToken(session, env, sid);
  if (!token) return ok({ error: "token_expired" }, 401);

  // Ensure /receipts and /receipts/Pending both exist
  const rootId    = await driveRootFolderId(token, RECEIPTS_ROOT);
  const pendingId = await driveGetOrCreate(token, PENDING_FOLDER, rootId);

  session.receiptsFolderId = rootId;
  session.pendingFolderId  = pendingId;
  await saveSession(env, sid, session);

  await env.KV.put("receipts_folder_id", rootId);
  await env.KV.put("pending_folder_id",  pendingId);
  await env.KV.put("google_refresh_token", session.googleRefreshToken || "");
  await env.KV.put("google_user_id",       session.id);

  // Watch the Pending folder — that's where the phone drops files
  return registerDriveWatch(env, token, pendingId);
}

async function registerDriveWatch(env, token, folderId) {
  const channelId = crypto.randomUUID();
  const expiry    = Date.now() + WEBHOOK_TTL * 1000;

  const r = await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}/watch`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      id:         channelId,
      type:       "web_hook",
      address:    `${env.APP_URL}/drive/webhook`,
      token:      env.WEBHOOK_SECRET,
      expiration: expiry,
    }),
  });
  const data = await r.json();

  if (data.resourceId) {
    await env.KV.put("webhook_channel_id",  channelId);
    await env.KV.put("webhook_resource_id", data.resourceId);
    await env.KV.put("webhook_expiry",      String(expiry));
    return ok({ ok: true, channelId, expiry });
  }
  return ok({ error: "watch_failed", detail: data }, 500);
}

async function renewWebhook(env) {
  const expiry = parseInt(await env.KV.get("webhook_expiry") || "0");
  if (expiry - Date.now() > 60 * 60 * 24 * 1000) return; // >1 day left, skip

  const refreshToken = await env.KV.get("google_refresh_token");
  if (!refreshToken) return;

  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      grant_type:    "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  const d = await r.json();
  if (!d.access_token) return;

  const folderId = await env.KV.get("pending_folder_id");
  if (folderId) await registerDriveWatch(env, d.access_token, folderId);
}

// ── Pushover notifications ─────────────────────────────────────────────────

async function pushover(env, { title, message, url, url_title, priority = 0, sound }) {
  if (!env.PUSHOVER_USER_KEY || !env.PUSHOVER_API_TOKEN) return; // silently skip if not configured

  const body = new URLSearchParams({
    token:    env.PUSHOVER_API_TOKEN,
    user:     env.PUSHOVER_USER_KEY,
    title:    title   || "Expense Tracker",
    message:  message || "",
    priority: String(priority),
  });
  if (url)       body.set("url",       url);
  if (url_title) body.set("url_title", url_title);
  if (sound)     body.set("sound",     sound);

  try {
    await fetch("https://api.pushover.net/1/messages.json", {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  } catch {}  // never let notification failure break the main flow
}

async function pushoverDailyNudge(env) {
  // Count pending items and their ages
  const list  = await env.KV.list({ prefix: "pending_" });
  if (!list.keys.length) return;

  const now   = Date.now();
  const items = await Promise.all(list.keys.map(async k => {
    const v = await env.KV.get(k.name);
    return v ? JSON.parse(v) : null;
  }));

  const valid   = items.filter(Boolean);
  const oldest  = valid.reduce((o, i) => {
    const age = now - new Date(i.createdAt).getTime();
    return age > o ? age : o;
  }, 0);
  const oldestDays = Math.floor(oldest / (1000 * 60 * 60 * 24));

  await pushover(env, {
    title:     `${valid.length} receipt${valid.length !== 1 ? "s" : ""} waiting to be filed`,
    message:   `Oldest is ${oldestDays === 0 ? "today" : `${oldestDays} day${oldestDays !== 1 ? "s" : ""} old`}. Don't let them pile up!`,
    url:       env.FRONTEND_URL + "?tab=pending",
    url_title: "File receipts now →",
    priority:  valid.length > 5 ? 1 : 0,  // bump to high priority if >5 pending
    sound:     "none",  // quiet for daily digest
  });
}

// ── Drive Webhook Handler ──────────────────────────────────────────────────

async function driveWebhook(request, env) {
  if (request.headers.get("X-Goog-Channel-Token") !== env.WEBHOOK_SECRET)
    return new Response("Forbidden", { status: 403 });

  const state = request.headers.get("X-Goog-Resource-State");
  if (state === "sync" || (state !== "add" && state !== "update"))
    return new Response("ok");

  const refreshToken = await env.KV.get("google_refresh_token");
  if (!refreshToken) return new Response("No token", { status: 500 });

  const tr = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      grant_type:    "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  const td = await tr.json();
  if (!td.access_token) return new Response("Token failed", { status: 500 });

  const driveToken  = td.access_token;
  const pendingId   = await env.KV.get("pending_folder_id");
  if (!pendingId) return new Response("No pending folder", { status: 500 });

  // Files dropped directly into /receipts/Pending
  const q = `"${pendingId}" in parents and mimeType != "application/vnd.google-apps.folder" and trashed=false`;
  const listing = await driveList(driveToken, q, "files(id,name,mimeType,createdTime,parents)");

  for (const file of (listing.files || [])) {
    if (await env.KV.get(`pending_${file.id}`)) continue;
    if (!file.mimeType.startsWith("image/") && file.mimeType !== "application/pdf") continue;

    let extracted = {};
    try {
      const b64    = await driveDownloadBase64(driveToken, file.id);
      const isPdf  = file.mimeType === "application/pdf";

      // Build the correct content block — PDFs use document type, images use image type
      const fileBlock = isPdf
        ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } }
        : { type: "image",    source: { type: "base64", media_type: file.mimeType,     data: b64 } };

      const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type":      "application/json",
          "x-api-key":         env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model:      "claude-haiku-4-5-20251001",
          max_tokens: 1500,
          messages: [{
            role: "user",
            content: [
              fileBlock,
              { type: "text", text: `You are a receipt data extractor. Analyse this receipt image and extract every piece of information present.

Return ONLY a valid JSON object — no markdown, no preamble. Omit any field that is genuinely absent from the receipt (do not include empty strings for missing fields).

Required fields (always include if visible):
{
  "merchant": "business name",
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "total_amount": "numeric string e.g. 42.50",
  "currency": "ISO code e.g. GBP, USD, HKD, EUR, SGD",
  "category": "one of: meals, transport, accommodation, entertainment, supplies, telecoms, other"
}

Include these if present on the receipt:
{
  "merchant_address": "full address of the business",
  "merchant_phone": "phone number",
  "merchant_website": "website or email",
  "customer_name": "name of customer if shown",
  "customer_address": "customer address if shown",
  "nationality": "nationality if shown e.g. on hotel receipts",
  "room_number": "hotel room if applicable",
  "check_in": "YYYY-MM-DD",
  "check_out": "YYYY-MM-DD",
  "payment_method": "e.g. Visa, Mastercard, Cash, Amex, WeChat Pay, Alipay",
  "card_last4": "last 4 digits if shown",
  "receipt_number": "receipt or invoice number",
  "order_number": "order or booking reference",
  "subtotal": "pre-tax total as numeric string",
  "taxes": [
    { "name": "VAT", "rate": "20%", "amount": "7.00" },
    { "name": "City Tax", "rate": "", "amount": "3.50" },
    { "name": "Service Charge", "rate": "10%", "amount": "3.50" }
  ],
  "tip": "tip or gratuity amount as numeric string",
  "discount": "discount amount as numeric string",
  "items": [
    { "name": "item description", "qty": "1", "unit_price": "15.00", "total": "15.00" }
  ],
  "notes": "any other relevant text e.g. 'Non-refundable', 'VAT No: GB123456'"
}

Be thorough — hotel folios, restaurant bills, taxi receipts and airline tickets all have different fields. Extract whatever is there.` },
            ],
          }],
        }),
      });
      const aiData = await aiRes.json();
      const raw    = aiData.content?.find(b => b.type === "text")?.text || "{}";
      extracted    = JSON.parse(raw.replace(/```json|```/g, "").trim());
    } catch {}

    // Normalise: map new schema fields → legacy top-level fields the app expects
    const normalised = {
      merchant:    extracted.merchant    || "",
      date:        extracted.date        || "",
      time:        extracted.time        || "",
      amount:      extracted.total_amount|| "",
      currency:    extracted.currency    || "GBP",
      category:    extracted.category    || "other",
      // keep full extracted blob for display in triage modal
      extracted,
    };

    const pending = {
      id:          file.id,
      driveFileId: file.id,
      driveName:   file.name,
      driveParent: pendingId,
      driveLink:   `https://drive.google.com/file/d/${file.id}/view`,
      createdAt:   file.createdTime || new Date().toISOString(),
      ...normalised,
    };

    await env.KV.put(`pending_${file.id}`, JSON.stringify(pending), { expirationTtl: 60 * 60 * 24 * 30 });

    // Instant Pushover — deduplicated per file ID so repeat webhook pings don't spam
    const notifyKey = `notified_${file.id}`;
    const alreadyNotified = await env.KV.get(notifyKey);
    if (!alreadyNotified) {
      await env.KV.put(notifyKey, "1", { expirationTtl: 60 * 60 * 24 * 30 });
      await pushover(env, {
        title:   `New receipt — ${normalised.merchant || file.name}`,
        message: [
          normalised.amount   ? `${normalised.currency || "GBP"} ${normalised.amount}` : null,
          normalised.date     ? `📅 ${normalised.date}`                                : null,
          normalised.category ? normalised.category                                    : null,
          "Tap to triage →",
        ].filter(Boolean).join("  ·  "),
        url:       env.FRONTEND_URL + "?tab=pending",
        url_title: "Open Expense Tracker",
        priority:  0,
      });
    }
  }

  return new Response("ok");
}

// ── Pending ────────────────────────────────────────────────────────────────

async function getPending(request, env) {
  const { session } = await loadSession(request, env);
  if (!session) return ok({ error: "unauthenticated" }, 401);

  const userId = await env.KV.get("google_user_id");
  if (userId && userId !== session.id) return ok({ error: "wrong_user" }, 403);

  const list  = await env.KV.list({ prefix: "pending_" });
  const items = await Promise.all(list.keys.map(async k => {
    const v = await env.KV.get(k.name);
    if (!v) return null;
    try { return JSON.parse(v); }
    catch {
      // Corrupt entry — delete it and skip
      await env.KV.delete(k.name);
      return null;
    }
  }));
  return ok(items.filter(Boolean));
}

// ── Assign ────────────────────────────────────────────────────────────────

async function assignReceipt(request, env) {
  const { session, sid } = await loadSession(request, env);
  if (!session) return ok({ error: "unauthenticated" }, 401);

  const token = await freshToken(session, env, sid);
  if (!token) return ok({ error: "token_expired" }, 401);

  const body = await request.json();
  const { fileId, tripName, year, merchant, date, time, amount, currency,
          taxes, payment_method, card_last4, items, category, description,
          merchant_address, customer_name, receipt_number, notes,
          personal, personalPct, extracted } = body;

  const pendingRaw = await env.KV.get(`pending_${fileId}`);
  if (!pendingRaw) return ok({ error: "not_found" }, 404);
  const pending = JSON.parse(pendingRaw);

  // Build /receipts/2026/Trip Name — always from the receipts root
  const rootId = await driveRootFolderId(token, RECEIPTS_ROOT);
  const yearId = await driveGetOrCreate(token, year || String(new Date().getFullYear()), rootId);
  const tripId = await driveGetOrCreate(token, tripName, yearId);

  // Rename to merchant_date.ext
  const slug      = (merchant || "receipt").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  const dateClean = (date || new Date().toISOString().split("T")[0]).replace(/-/g, "");
  const ext       = pending.driveName.includes(".") ? pending.driveName.split(".").pop() : "jpg";
  const newName   = `${slug}_${dateClean}.${ext}`;

  await driveRenameFile(token, fileId, newName);
  const moved = await driveMoveFile(token, fileId, tripId, pending.driveParent);

  const expense = {
    id:          fileId,
    type:        "expense",
    filename:    newName,
    driveFileId: fileId,
    driveLink:   moved.webViewLink || pending.driveLink,
    tripName,
    year:        year || String(new Date().getFullYear()),
    // core display fields
    merchant, date, time, amount,
    currency:    currency || "GBP",
    category,    description,
    // rich fields
    merchant_address, customer_name, receipt_number, notes,
    taxes:          taxes          || [],
    items:          items          || [],
    payment_method: payment_method || "",
    card_last4:     card_last4     || "",
    // full AI blob preserved for future use / export
    extracted:   extracted || pending.extracted || {},
    // expense split
    personal:    personal || "none",
    personalPct: personal === "partial" ? personalPct : personal === "full" ? 100 : 0,
    assignedAt:  new Date().toISOString(),
  };

  const expKey  = `expenses_${session.id}`;
  const expData = JSON.parse(await env.KV.get(expKey) || "[]");
  expData.push(expense);
  await env.KV.put(expKey, JSON.stringify(expData), { expirationTtl: SESSION_TTL * 52 });
  await env.KV.delete(`pending_${fileId}`);
  await env.KV.delete(`notified_${fileId}`);

  return ok({ ok: true, expense });
}

// ── Expenses ───────────────────────────────────────────────────────────────

async function handleExpenses(request, env) {
  const { session } = await loadSession(request, env);
  if (!session) return ok({ error: "unauthenticated" }, 401);

  const key = `expenses_${session.id}`;
  if (request.method === "GET") {
    return ok(JSON.parse(await env.KV.get(key) || "[]"));
  }
  if (request.method === "POST") {
    await env.KV.put(key, JSON.stringify(await request.json()), { expirationTtl: SESSION_TTL * 52 });
    return ok({ ok: true });
  }
  return new Response("Method not allowed", { status: 405 });
}

// ── Email Trip ─────────────────────────────────────────────────────────────

async function emailTrip(request, env) {
  const { session, sid } = await loadSession(request, env);
  if (!session) return ok({ error: "unauthenticated" }, 401);

  const token = await freshToken(session, env, sid);
  if (!token) return ok({ error: "token_expired" }, 401);

  const { toEmail, tripName, year, expenses } = await request.json();
  if (!toEmail || !tripName || !expenses?.length) return ok({ error: "missing_fields" }, 400);

  const rows = [["Filename","Date","Time","Merchant","Description","Category",
                 "Amount","Currency","Tax Type","Tax Amount","Personal %","Work Amount","Drive Link"]];
  let totalWork = 0;
  for (const e of expenses) {
    const amt  = parseFloat(e.amount) || 0;
    const work = +(amt * (100 - (e.personalPct || 0)) / 100).toFixed(2);
    totalWork += work;
    rows.push([e.filename, e.date, e.time||"", e.merchant, e.description||"", e.category||"",
               amt, e.currency||"GBP", e.tax_type||"none", e.tax_amount||"",
               e.personalPct||0, work, e.driveLink||""]);
  }
  rows.push(["TOTAL","","","","","","","","","","",+totalWork.toFixed(2),""]);

  const csv      = rows.map(r => r.map(v => `"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\r\n");
  const csvName  = `${tripName.replace(/[^a-zA-Z0-9_-]/g,"_")}_${year}_expenses.csv`;
  const boundary = `b${crypto.randomUUID().replace(/-/g,"")}`;
  const dateStr  = new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"});

  const bodyText = [
    `Expenses: ${tripName} ${year}`,
    `Sent: ${new Date().toUTCString()}`,
    `Receipts: ${expenses.length}  |  Work total: ${expenses[0]?.currency||"GBP"} ${totalWork.toFixed(2)}`,
    "",
    `Receipts in Drive → ${RECEIPTS_ROOT}/${year}/${tripName}`,
    "",
    "Attached:",
    `  • ${csvName}`,
    ...expenses.map(e => `  • ${e.filename}  ${e.driveLink||""}`),
  ].join("\n");

  const parts = [
    `--${boundary}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${bodyText}`,
    [`--${boundary}`, `Content-Type: text/csv`, `Content-Disposition: attachment; filename="${csvName}"`,
     `Content-Transfer-Encoding: base64`, ``, btoa(unescape(encodeURIComponent(csv)))].join("\r\n"),
  ];

  for (const e of expenses) {
    if (!e.driveFileId) continue;
    try {
      const b64  = await driveDownloadBase64(token, e.driveFileId);
      const mime = e.filename.endsWith(".pdf") ? "application/pdf" : "image/jpeg";
      parts.push([`--${boundary}`, `Content-Type: ${mime}`,
        `Content-Disposition: attachment; filename="${e.filename}"`,
        `Content-Transfer-Encoding: base64`, ``, b64].join("\r\n"));
    } catch {}
  }
  parts.push(`--${boundary}--`);

  const mime = [
    `From: ${session.name} <${session.email}>`,
    `To: ${toEmail}`,
    `Subject: Expenses — ${tripName} ${year} (${dateStr})`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    ``, parts.join("\r\n"),
  ].join("\r\n");

  const encoded = btoa(unescape(encodeURIComponent(mime)))
    .replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");

  const gr = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: encoded }),
  });
  if (!gr.ok) {
    const e = await gr.json();
    return ok({ error: "gmail_failed", message: e.error?.message }, 500);
  }
  return ok({ ok: true });
}


// ── Delete Pending ─────────────────────────────────────────────────────────
// Removes KV entry and optionally trashes the Drive file.
// Called when user dismisses an erroneous receipt from the inbox.

async function deletePending(request, env) {
  const { session, sid } = await loadSession(request, env);
  if (!session) return ok({ error: "unauthenticated" }, 401);

  const token = await freshToken(session, env, sid);
  const { fileId, trashDrive = true } = await request.json();
  if (!fileId) return ok({ error: "missing fileId" }, 400);

  // Remove from KV
  await env.KV.delete(`pending_${fileId}`);
  await env.KV.delete(`notified_${fileId}`);

  // Optionally trash in Drive (best-effort, don't fail if token missing)
  if (trashDrive && token) {
    try {
      await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ trashed: true }),
      });
    } catch {}
  }

  return ok({ ok: true });
}

// ── Delete Expense ─────────────────────────────────────────────────────────
// Removes a filed expense from KV. Does NOT touch Drive — the file has
// already been moved to its trip folder and you may want to keep it.

async function deleteExpense(request, env) {
  const { session } = await loadSession(request, env);
  if (!session) return ok({ error: "unauthenticated" }, 401);

  const { expenseId } = await request.json();
  if (!expenseId) return ok({ error: "missing expenseId" }, 400);

  const key  = `expenses_${session.id}`;
  const data = JSON.parse(await env.KV.get(key) || "[]");
  const next = data.filter(e => e.id !== expenseId);
  await env.KV.put(key, JSON.stringify(next), { expirationTtl: SESSION_TTL * 52 });

  return ok({ ok: true, removed: data.length - next.length });
}

// ── Utilities ──────────────────────────────────────────────────────────────

function ok(data, status = 200) {
  return new Response(data === null ? null : JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function htmlRedirect(url) {
  return new Response(`<html><head><meta http-equiv="refresh" content="0;url=${url}"></head></html>`,
    { status: 200, headers: { "Content-Type": "text/html" } });
}
