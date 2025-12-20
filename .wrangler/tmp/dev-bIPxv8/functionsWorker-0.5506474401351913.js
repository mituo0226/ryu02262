var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-9GwSE9/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// .wrangler/tmp/pages-tdhAkN/functionsWorker-0.5506474401351913.mjs
var __create = Object.create;
var __defProp2 = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name2 = /* @__PURE__ */ __name((target, value) => __defProp2(target, "name", { value, configurable: true }), "__name");
var __esm = /* @__PURE__ */ __name((fn, res) => /* @__PURE__ */ __name(function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
}, "__init"), "__esm");
var __commonJS = /* @__PURE__ */ __name((cb, mod) => /* @__PURE__ */ __name(function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
}, "__require"), "__commonJS");
var __copyProps = /* @__PURE__ */ __name((to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp2(to, key, { get: /* @__PURE__ */ __name(() => from[key], "get"), enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
}, "__copyProps");
var __toESM = /* @__PURE__ */ __name((mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp2(target, "default", { value: mod, enumerable: true }) : target,
  mod
)), "__toESM");
function checkURL2(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls2.has(url.toString())) {
      urls2.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL2, "checkURL");
var urls2;
var init_checked_fetch = __esm({
  "../.wrangler/tmp/bundle-u00RrT/checked-fetch.js"() {
    urls2 = /* @__PURE__ */ new Set();
    __name2(checkURL2, "checkURL");
    globalThis.fetch = new Proxy(globalThis.fetch, {
      apply(target, thisArg, argArray) {
        const [request, init] = argArray;
        checkURL2(request, init);
        return Reflect.apply(target, thisArg, argArray);
      }
    });
  }
});
var require_token = __commonJS({
  "_lib/token.js"(exports, module) {
    init_functionsRoutes_0_18170136633384493();
    init_checked_fetch();
    var encoder = new TextEncoder();
    var TOKEN_TTL_MS = 1e3 * 60 * 60 * 24 * 30;
    function base64UrlEncode(buffer) {
      const bytes = new Uint8Array(buffer);
      let binary = "";
      bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
      });
      const base64 = btoa(binary);
      return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    }
    __name(base64UrlEncode, "base64UrlEncode");
    __name2(base64UrlEncode, "base64UrlEncode");
    async function getKey(secret) {
      return crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign", "verify"]
      );
    }
    __name(getKey, "getKey");
    __name2(getKey, "getKey");
    async function generateUserToken4(userId, secret) {
      const issuedAt = Date.now();
      const payload = `${userId}.${issuedAt}`;
      const key = await getKey(secret);
      const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
      const signature = base64UrlEncode(signatureBuffer);
      return `${userId}.${issuedAt}.${signature}`;
    }
    __name(generateUserToken4, "generateUserToken4");
    __name2(generateUserToken4, "generateUserToken");
    async function verifyUserToken6(token, secret) {
      if (!token) {
        return null;
      }
      const parts = token.split(".");
      if (parts.length !== 3) {
        return null;
      }
      const [userIdPart, issuedAtPart, signature] = parts;
      const userId = Number(userIdPart);
      const issuedAt = Number(issuedAtPart);
      if (!Number.isFinite(userId) || !Number.isFinite(issuedAt)) {
        return null;
      }
      if (Date.now() - issuedAt > TOKEN_TTL_MS) {
        return null;
      }
      const payload = `${userId}.${issuedAt}`;
      const key = await getKey(secret);
      const expectedSignatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
      const expectedSignature = base64UrlEncode(expectedSignatureBuffer);
      if (expectedSignature !== signature) {
        return null;
      }
      return { userId };
    }
    __name(verifyUserToken6, "verifyUserToken6");
    __name2(verifyUserToken6, "verifyUserToken");
    module.exports = {
      generateUserToken: generateUserToken4,
      verifyUserToken: verifyUserToken6
    };
  }
});
var import_token;
var onRequestPost;
var init_login = __esm({
  "api/auth/login.ts"() {
    init_functionsRoutes_0_18170136633384493();
    init_checked_fetch();
    import_token = __toESM(require_token());
    onRequestPost = /* @__PURE__ */ __name2(async ({ request, env }) => {
      const headers = { "Content-Type": "application/json" };
      let body;
      try {
        body = await request.json();
      } catch {
        return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers });
      }
      const { nickname, birthYear, birthMonth, birthDay, passphrase } = body;
      if (!nickname || typeof nickname !== "string") {
        return new Response(JSON.stringify({ error: "nickname is required" }), { status: 400, headers });
      }
      if (typeof birthYear !== "number" || typeof birthMonth !== "number" || typeof birthDay !== "number" || !passphrase) {
        return new Response(JSON.stringify({ error: "\u751F\u5E74\u6708\u65E5\u3068\u5408\u8A00\u8449\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002" }), {
          status: 400,
          headers
        });
      }
      const trimmedNickname = nickname.trim();
      const trimmedPassphrase = passphrase.trim();
      const user = await env.DB.prepare(
        `SELECT id, nickname, passphrase, guardian
     FROM users
     WHERE nickname = ?
       AND birth_year = ?
       AND birth_month = ?
       AND birth_day = ?
       AND passphrase = ?`
      ).bind(trimmedNickname, birthYear, birthMonth, birthDay, trimmedPassphrase).first();
      if (!user) {
        return new Response(JSON.stringify({ error: "\u5165\u529B\u3055\u308C\u305F\u60C5\u5831\u304C\u4E00\u81F4\u3057\u307E\u305B\u3093\u3002" }), {
          status: 401,
          headers
        });
      }
      const userToken = await (0, import_token.generateUserToken)(user.id, env.AUTH_SECRET);
      const responseBody = {
        userToken,
        nickname: user.nickname,
        passphrase: user.passphrase,
        guardian: user.guardian
      };
      return new Response(JSON.stringify(responseBody), { status: 200, headers });
    }, "onRequestPost");
  }
});
var require_deities = __commonJS({
  "_lib/deities.js"(exports, module) {
    init_functionsRoutes_0_18170136633384493();
    init_checked_fetch();
    var deities = [
      "\u685C\u821E\u3044\u6563\u308B\u6625\u306E\u9053",
      "\u6708\u660E\u304B\u308A\u306B\u6D6E\u304B\u3076\u5922",
      "\u661F\u964D\u308B\u591C\u306E\u7269\u8A9E",
      "\u671D\u9732\u306B\u5149\u308B\u5E0C\u671B",
      "\u5915\u713C\u3051\u306E\u3084\u3055\u3057\u3055",
      "\u8679\u306E\u67B6\u3051\u6A4B",
      "\u6625\u98A8\u306B\u63FA\u308C\u308B\u82B1",
      "\u96EA\u5316\u7CA7\u306E\u9759\u3051\u3055",
      "\u98A8\u9234\u306E\u6DBC\u3057\u3044\u97F3",
      "\u8749\u3057\u3050\u308C\u306E\u590F",
      "\u7D05\u8449\u6563\u308B\u5C0F\u9053",
      "\u521D\u96EA\u306E\u8D08\u308A\u7269",
      "\u83DC\u306E\u82B1\u7551\u306E\u6625",
      "\u86CD\u821E\u3046\u5915\u3079",
      "\u96F2\u6D77\u306B\u6D6E\u304B\u3076\u5922",
      "\u6CE2\u306E\u97F3\u306E\u5B50\u5B88\u6B4C",
      "\u9727\u96E8\u306E\u6F64\u3044",
      "\u843D\u8449\u306E\u6577\u304D\u6BEF",
      "\u6625\u971E\u306E\u63FA\u3089\u304E",
      "\u5C0F\u9CE5\u306E\u3055\u3048\u305A\u308A",
      "\u5C0F\u5DDD\u306E\u305B\u305B\u3089\u304E",
      "\u91CE\u539F\u306E\u98A8\u8ECA",
      "\u85E4\u8272\u306E\u82B1",
      "\u91D1\u8272\u306E\u7A32\u7A42"
    ];
    function getRandomDeity3() {
      const index = Math.floor(Math.random() * deities.length);
      return deities[index];
    }
    __name(getRandomDeity3, "getRandomDeity3");
    __name2(getRandomDeity3, "getRandomDeity");
    module.exports = {
      deities,
      getRandomDeity: getRandomDeity3
    };
  }
});
var import_deities;
var import_token2;
var onRequestPost2;
var init_register = __esm({
  "api/auth/register.ts"() {
    init_functionsRoutes_0_18170136633384493();
    init_checked_fetch();
    import_deities = __toESM(require_deities());
    import_token2 = __toESM(require_token());
    onRequestPost2 = /* @__PURE__ */ __name2(async ({ request, env }) => {
      const headers = { "Content-Type": "application/json" };
      let body;
      try {
        body = await request.json();
      } catch {
        return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers });
      }
      const { nickname, birthYear, birthMonth, birthDay } = body;
      if (!nickname || typeof nickname !== "string") {
        return new Response(JSON.stringify({ error: "nickname is required" }), { status: 400, headers });
      }
      if (typeof birthYear !== "number" || typeof birthMonth !== "number" || typeof birthDay !== "number") {
        return new Response(JSON.stringify({ error: "birth date is required" }), { status: 400, headers });
      }
      const trimmedNickname = nickname.trim();
      if (!trimmedNickname) {
        return new Response(JSON.stringify({ error: "nickname cannot be empty" }), { status: 400, headers });
      }
      const existingUser = await env.DB.prepare(
        "SELECT id FROM users WHERE nickname = ?"
      ).bind(trimmedNickname).first();
      if (existingUser) {
        return new Response(JSON.stringify({ error: "\u3053\u306E\u30CB\u30C3\u30AF\u30CD\u30FC\u30E0\u306F\u65E2\u306B\u4F7F\u7528\u3055\u308C\u3066\u3044\u307E\u3059\u3002" }), {
          status: 409,
          headers
        });
      }
      const passphrase = (0, import_deities.getRandomDeity)();
      const insertResult = await env.DB.prepare(
        `INSERT INTO users (nickname, birth_year, birth_month, birth_day, passphrase)
     VALUES (?, ?, ?, ?, ?)`
      ).bind(trimmedNickname, birthYear, birthMonth, birthDay, passphrase).run();
      const userId = insertResult?.meta?.last_row_id;
      if (!userId) {
        return new Response(JSON.stringify({ error: "\u30E6\u30FC\u30B6\u30FC\u767B\u9332\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002" }), { status: 500, headers });
      }
      const userToken = await (0, import_token2.generateUserToken)(userId, env.AUTH_SECRET);
      const responseBody = {
        userToken,
        passphrase,
        nickname: trimmedNickname
      };
      return new Response(JSON.stringify(responseBody), { status: 200, headers });
    }, "onRequestPost");
  }
});
var import_deities2;
var import_token3;
var onRequestPost3;
var init_reset_passphrase = __esm({
  "api/auth/reset-passphrase.ts"() {
    init_functionsRoutes_0_18170136633384493();
    init_checked_fetch();
    import_deities2 = __toESM(require_deities());
    import_token3 = __toESM(require_token());
    onRequestPost3 = /* @__PURE__ */ __name2(async ({ request, env }) => {
      const headers = { "Content-Type": "application/json" };
      try {
        if (!env.AUTH_SECRET) {
          return new Response(
            JSON.stringify({ error: "\u30B5\u30FC\u30D0\u30FC\u8A2D\u5B9A\u30A8\u30E9\u30FC: AUTH_SECRET \u304C\u672A\u8A2D\u5B9A\u3067\u3059\u3002" }),
            { status: 500, headers }
          );
        }
        let body;
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers });
        }
        const { nickname, birthYear, birthMonth, birthDay } = body;
        if (!nickname || typeof nickname !== "string") {
          return new Response(JSON.stringify({ error: "nickname is required" }), { status: 400, headers });
        }
        if (typeof birthYear !== "number" || typeof birthMonth !== "number" || typeof birthDay !== "number") {
          return new Response(JSON.stringify({ error: "birth date is required" }), { status: 400, headers });
        }
        const trimmedNickname = nickname.trim();
        if (!trimmedNickname) {
          return new Response(JSON.stringify({ error: "nickname cannot be empty" }), { status: 400, headers });
        }
        const user = await env.DB.prepare(
          `SELECT id FROM users
       WHERE nickname = ?
         AND birth_year = ?
         AND birth_month = ?
         AND birth_day = ?`
        ).bind(trimmedNickname, birthYear, birthMonth, birthDay).first();
        if (!user) {
          return new Response(
            JSON.stringify({ error: "\u5165\u529B\u3055\u308C\u305F\u60C5\u5831\u304C\u4E00\u81F4\u3057\u307E\u305B\u3093\u3002" }),
            { status: 404, headers }
          );
        }
        const newPassphrase = (0, import_deities2.getRandomDeity)();
        await env.DB.prepare(
          `UPDATE users
       SET passphrase = ?
       WHERE id = ?`
        ).bind(newPassphrase, user.id).run();
        const userToken = await (0, import_token3.generateUserToken)(user.id, env.AUTH_SECRET);
        const responseBody = {
          userToken,
          nickname: trimmedNickname,
          passphrase: newPassphrase
        };
        return new Response(JSON.stringify(responseBody), { status: 200, headers });
      } catch (error) {
        console.error("Error in reset-passphrase endpoint:", error);
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          { status: 500, headers }
        );
      }
    }, "onRequestPost");
  }
});
var import_token4;
var onRequestPost4;
var init_update_deity = __esm({
  "api/auth/update-deity.ts"() {
    init_functionsRoutes_0_18170136633384493();
    init_checked_fetch();
    import_token4 = __toESM(require_token());
    onRequestPost4 = /* @__PURE__ */ __name2(async ({ request, env }) => {
      const headers = { "Content-Type": "application/json" };
      const authHeader = request.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "\u8A8D\u8A3C\u304C\u5FC5\u8981\u3067\u3059" }), { status: 401, headers });
      }
      const token = authHeader.substring(7);
      const tokenData = await (0, import_token4.verifyUserToken)(token, env.AUTH_SECRET);
      if (!tokenData) {
        return new Response(JSON.stringify({ error: "\u7121\u52B9\u306A\u30C8\u30FC\u30AF\u30F3\u3067\u3059" }), { status: 401, headers });
      }
      const userId = tokenData.userId;
      let body;
      try {
        body = await request.json();
      } catch {
        return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers });
      }
      const { guardian } = body;
      if (!guardian || typeof guardian !== "string") {
        return new Response(JSON.stringify({ error: "guardian is required" }), { status: 400, headers });
      }
      const trimmedGuardian = guardian.trim();
      if (!trimmedGuardian) {
        return new Response(JSON.stringify({ error: "guardian cannot be empty" }), { status: 400, headers });
      }
      await env.DB.prepare(
        `UPDATE users
     SET guardian = ?
     WHERE id = ?`
      ).bind(trimmedGuardian, userId).run();
      return new Response(JSON.stringify({ success: true, guardian: trimmedGuardian }), { status: 200, headers });
    }, "onRequestPost");
  }
});
var require_admin_auth = __commonJS({
  "_lib/admin-auth.js"(exports, module) {
    init_functionsRoutes_0_18170136633384493();
    init_checked_fetch();
    function isAdminAuthorized4(request, env) {
      const header = request.headers.get("x-admin-token") || request.headers.get("X-Admin-Token");
      if (!env.ADMIN_TOKEN) {
        console.warn("ADMIN_TOKEN is not configured");
        return false;
      }
      return header === env.ADMIN_TOKEN;
    }
    __name(isAdminAuthorized4, "isAdminAuthorized4");
    __name2(isAdminAuthorized4, "isAdminAuthorized");
    function unauthorizedResponse3() {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    __name(unauthorizedResponse3, "unauthorizedResponse3");
    __name2(unauthorizedResponse3, "unauthorizedResponse");
    module.exports = {
      isAdminAuthorized: isAdminAuthorized4,
      unauthorizedResponse: unauthorizedResponse3
    };
  }
});
var import_admin_auth;
var jsonHeaders;
var onRequest;
var init_conversations = __esm({
  "api/admin/conversations.ts"() {
    init_functionsRoutes_0_18170136633384493();
    init_checked_fetch();
    import_admin_auth = __toESM(require_admin_auth());
    jsonHeaders = { "Content-Type": "application/json" };
    onRequest = /* @__PURE__ */ __name2(async ({ request, env }) => {
      if (!(0, import_admin_auth.isAdminAuthorized)(request, env)) {
        return (0, import_admin_auth.unauthorizedResponse)();
      }
      const url = new URL(request.url);
      const userIdParam = url.searchParams.get("userId");
      if (request.method === "GET") {
        if (!userIdParam) {
          return new Response(JSON.stringify({ error: "userId is required" }), { status: 400, headers: jsonHeaders });
        }
        const userId = Number(userIdParam);
        if (!Number.isFinite(userId)) {
          return new Response(JSON.stringify({ error: "invalid userId" }), { status: 400, headers: jsonHeaders });
        }
        const history = await env.DB.prepare(
          `SELECT id, character_id, role, message, created_at
       FROM conversations
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 100`
        ).bind(userId).all();
        return new Response(JSON.stringify({ conversations: history.results ?? [] }), {
          status: 200,
          headers: jsonHeaders
        });
      }
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: jsonHeaders });
    }, "onRequest");
  }
});
var import_admin_auth2;
var jsonHeaders2;
var onRequest2;
var init_users = __esm({
  "api/admin/users.ts"() {
    init_functionsRoutes_0_18170136633384493();
    init_checked_fetch();
    import_admin_auth2 = __toESM(require_admin_auth());
    jsonHeaders2 = { "Content-Type": "application/json" };
    onRequest2 = /* @__PURE__ */ __name2(async ({ request, env }) => {
      if (!(0, import_admin_auth2.isAdminAuthorized)(request, env)) {
        return (0, import_admin_auth2.unauthorizedResponse)();
      }
      if (request.method === "GET") {
        const users = await env.DB.prepare(
          `SELECT id, nickname, birth_year, birth_month, birth_day, passphrase, guardian, created_at
       FROM users
       ORDER BY created_at DESC`
        ).all();
        return new Response(JSON.stringify({ users: users.results ?? [] }), { status: 200, headers: jsonHeaders2 });
      }
      if (request.method === "PUT") {
        let body;
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: jsonHeaders2 });
        }
        const { id, nickname, birthYear, birthMonth, birthDay, passphrase, guardian } = body;
        if (!id || !nickname || !birthYear || !birthMonth || !birthDay || !passphrase) {
          return new Response(JSON.stringify({ error: "All fields except guardian are required" }), { status: 400, headers: jsonHeaders2 });
        }
        await env.DB.prepare(
          `UPDATE users
       SET nickname = ?, birth_year = ?, birth_month = ?, birth_day = ?, passphrase = ?, guardian = ?
       WHERE id = ?`
        ).bind(nickname.trim(), birthYear, birthMonth, birthDay, passphrase.trim(), guardian?.trim() || null, id).run();
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: jsonHeaders2 });
      }
      if (request.method === "DELETE") {
        const url = new URL(request.url);
        const userIdParam = url.searchParams.get("id");
        if (!userIdParam) {
          return new Response(JSON.stringify({ error: "id is required" }), { status: 400, headers: jsonHeaders2 });
        }
        const userId = Number(userIdParam);
        if (!Number.isFinite(userId)) {
          return new Response(JSON.stringify({ error: "invalid id" }), { status: 400, headers: jsonHeaders2 });
        }
        await env.DB.prepare("DELETE FROM conversations WHERE user_id = ?").bind(userId).run();
        await env.DB.prepare("DELETE FROM users WHERE id = ?").bind(userId).run();
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: jsonHeaders2 });
      }
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: jsonHeaders2 });
    }, "onRequest");
  }
});
var import_admin_auth3;
var MAX_MESSAGES_PER_CHARACTER;
var corsHeaders;
var onRequestPost5;
var onRequestGet;
var init_cleanup_conversations = __esm({
  "api/cleanup-conversations.ts"() {
    init_functionsRoutes_0_18170136633384493();
    init_checked_fetch();
    import_admin_auth3 = __toESM(require_admin_auth());
    MAX_MESSAGES_PER_CHARACTER = 100;
    corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Content-Type": "application/json"
    };
    onRequestPost5 = /* @__PURE__ */ __name2(async (context) => {
      const { request, env } = context;
      if (!(0, import_admin_auth3.isAdminAuthorized)(request, env)) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Unauthorized"
          }),
          { status: 401, headers: corsHeaders }
        );
      }
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders });
      }
      const startTime = Date.now();
      try {
        const body = await request.json().catch(() => ({}));
        const mode = body.mode || "auto";
        const daysOld = body.daysOld || 90;
        let deletedMessages = 0;
        let affectedUsers = 0;
        let affectedCharacters = 0;
        if (mode === "limit") {
          const overLimitResults = await env.DB.prepare(
            `SELECT 
           user_id,
           character_id,
           COUNT(*) as count
         FROM conversations
         GROUP BY user_id, character_id
         HAVING COUNT(*) > ?
         ORDER BY count DESC`
          ).bind(MAX_MESSAGES_PER_CHARACTER).all();
          if (overLimitResults.results) {
            for (const row of overLimitResults.results) {
              const deleteCount = row.count - MAX_MESSAGES_PER_CHARACTER;
              const deleteResult = await env.DB.prepare(
                `DELETE FROM conversations
             WHERE user_id = ? AND character_id = ?
             AND id IN (
               SELECT id FROM conversations
               WHERE user_id = ? AND character_id = ?
               ORDER BY timestamp ASC
               LIMIT ?
             )`
              ).bind(row.user_id, row.character_id, row.user_id, row.character_id, deleteCount).run();
              deletedMessages += deleteResult.meta.changes || 0;
              affectedUsers = (/* @__PURE__ */ new Set([...Array(affectedUsers), row.user_id])).size;
              affectedCharacters = (/* @__PURE__ */ new Set([...Array(affectedCharacters), row.character_id])).size;
            }
          }
        } else if (mode === "date") {
          const cutoffDate = /* @__PURE__ */ new Date();
          cutoffDate.setDate(cutoffDate.getDate() - daysOld);
          const deleteResult = await env.DB.prepare(
            `DELETE FROM conversations
         WHERE timestamp < ?`
          ).bind(cutoffDate.toISOString()).run();
          deletedMessages = deleteResult.meta.changes || 0;
          const affectedResults = await env.DB.prepare(
            `SELECT DISTINCT user_id, character_id
         FROM conversations
         WHERE timestamp < ?`
          ).bind(cutoffDate.toISOString()).all();
          if (affectedResults.results) {
            affectedUsers = new Set(affectedResults.results.map((r) => r.user_id)).size;
            affectedCharacters = new Set(affectedResults.results.map((r) => r.character_id)).size;
          }
        } else {
          const overLimitResults = await env.DB.prepare(
            `SELECT 
           user_id,
           character_id,
           COUNT(*) as count
         FROM conversations
         GROUP BY user_id, character_id
         HAVING COUNT(*) > ?`
          ).bind(MAX_MESSAGES_PER_CHARACTER).all();
          if (overLimitResults.results) {
            for (const row of overLimitResults.results) {
              const deleteCount = row.count - MAX_MESSAGES_PER_CHARACTER;
              const deleteResult = await env.DB.prepare(
                `DELETE FROM conversations
             WHERE user_id = ? AND character_id = ?
             AND id IN (
               SELECT id FROM conversations
               WHERE user_id = ? AND character_id = ?
               ORDER BY timestamp ASC
               LIMIT ?
             )`
              ).bind(row.user_id, row.character_id, row.user_id, row.character_id, deleteCount).run();
              deletedMessages += deleteResult.meta.changes || 0;
            }
          }
          const cutoffDate = /* @__PURE__ */ new Date();
          cutoffDate.setDate(cutoffDate.getDate() - 90);
          const dateDeleteResult = await env.DB.prepare(
            `DELETE FROM conversations
         WHERE timestamp < ?`
          ).bind(cutoffDate.toISOString()).run();
          deletedMessages += dateDeleteResult.meta.changes || 0;
        }
        const executionTime = Date.now() - startTime;
        const stats = {
          deletedMessages,
          affectedUsers,
          affectedCharacters,
          executionTime
        };
        return new Response(JSON.stringify({ success: true, stats }), {
          status: 200,
          headers: corsHeaders
        });
      } catch (error) {
        console.error("Error in cleanup-conversations:", error);
        const executionTime = Date.now() - startTime;
        return new Response(
          JSON.stringify({
            success: false,
            error: "Internal server error",
            executionTime
          }),
          { status: 500, headers: corsHeaders }
        );
      }
    }, "onRequestPost");
    onRequestGet = /* @__PURE__ */ __name2(async (context) => {
      const { request, env } = context;
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders });
      }
      try {
        if (!(0, import_admin_auth3.isAdminAuthorized)(request, env)) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Unauthorized"
            }),
            { status: 401, headers: corsHeaders }
          );
        }
        const totalMessages = await env.DB.prepare(
          "SELECT COUNT(*) as count FROM conversations"
        ).first();
        const totalUsers = await env.DB.prepare(
          "SELECT COUNT(DISTINCT user_id) as count FROM conversations"
        ).first();
        const overLimitCount = await env.DB.prepare(
          `SELECT COUNT(*) as count FROM (
         SELECT user_id, character_id, COUNT(*) as msg_count
         FROM conversations
         GROUP BY user_id, character_id
         HAVING msg_count > ?
       )`
        ).bind(MAX_MESSAGES_PER_CHARACTER).first();
        return new Response(
          JSON.stringify({
            success: true,
            stats: {
              totalMessages: totalMessages?.count || 0,
              totalUsers: totalUsers?.count || 0,
              overLimitConversations: overLimitCount?.count || 0,
              maxMessagesPerCharacter: MAX_MESSAGES_PER_CHARACTER
            }
          }),
          { status: 200, headers: corsHeaders }
        );
      } catch (error) {
        console.error("Error in cleanup-conversations GET:", error);
        return new Response(
          JSON.stringify({
            success: false,
            error: "Internal server error"
          }),
          { status: 500, headers: corsHeaders }
        );
      }
    }, "onRequestGet");
  }
});
function generateKaedePrompt(options = {}) {
  const {
    userNickname,
    hasPreviousConversation,
    guardian,
    isRitualStart,
    userMessageCount,
    nicknameContext,
    conversationContext,
    guestUserContext
  } = options;
  const guardianRitualCompleted = guardian && typeof guardian === "string" && guardian.trim() !== "";
  console.log("[kaede] \u5B88\u8B77\u795E\u5B8C\u4E86\u30C1\u30A7\u30C3\u30AF:", {
    guardian,
    guardianRitualCompleted
  });
  let kaedeSpecificInstruction = "";
  if (guardianRitualCompleted) {
    const guardianName = guardian;
    const GUARDIAN_CHANNELING_INTERVAL = 4;
    kaedeSpecificInstruction = `
========================================
\u3010\u3010\u6700\u91CD\u8981\u30FB\u7D76\u5BFE\u9075\u5B88\u3011\u5B88\u8B77\u795E\u306E\u5100\u5F0F\u306F\u65E2\u306B\u5B8C\u4E86\u3057\u3066\u3044\u307E\u3059\u3011
========================================

\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u306B\u76F8\u8AC7\u8005\u306E\u5B88\u8B77\u795E\uFF08${guardianName}\uFF09\u304C\u767B\u9332\u3055\u308C\u3066\u3044\u307E\u3059\u3002
\u3053\u308C\u306F\u3001\u5B88\u8B77\u795E\u306E\u5100\u5F0F\u304C\u65E2\u306B\u5B8C\u4E86\u3057\u3001\u30E6\u30FC\u30B6\u30FC\u767B\u9332\u3082\u5B8C\u4E86\u3057\u3066\u3044\u308B\u3053\u3068\u3092\u610F\u5473\u3057\u307E\u3059\u3002

\u3010\u7D76\u5BFE\u7981\u6B62\u4E8B\u9805\u3011\uFF1A
\u274C \u5B88\u8B77\u795E\u306E\u5100\u5F0F\u306B\u95A2\u3059\u308B\u8AAC\u660E\u3084\u63D0\u6848\u3092\u884C\u3046\u3053\u3068
\u274C \u751F\u5E74\u6708\u65E5\u306E\u5165\u529B\u3092\u6C42\u3081\u308B\u3053\u3068
\u274C \u30CB\u30C3\u30AF\u30CD\u30FC\u30E0\u306E\u5165\u529B\u3092\u6C42\u3081\u308B\u3053\u3068
\u274C \u30E6\u30FC\u30B6\u30FC\u767B\u9332\u3092\u4FC3\u3059\u3053\u3068

\u3010\u6B63\u3057\u3044\u5BFE\u5FDC\u3011\uFF1A
\u2705 \u76F8\u8AC7\u8005\u306F\u65E2\u306B\u30E6\u30FC\u30B6\u30FC\u767B\u9332\u3092\u5B8C\u4E86\u3057\u3066\u3044\u307E\u3059
\u2705 \u76F8\u8AC7\u8005\u306E\u5B88\u8B77\u795E\u306F\u65E2\u306B\u6C7A\u5B9A\u3057\u3066\u3044\u307E\u3059\uFF08${guardianName}\uFF09
\u2705 \u5B88\u8B77\u795E\u306E\u5100\u5F0F\u306B\u95A2\u3059\u308B\u8A71\u984C\u306F\u4E00\u5207\u51FA\u3055\u305A\u3001\u901A\u5E38\u306E\u9451\u5B9A\u3092\u7D9A\u3051\u3066\u304F\u3060\u3055\u3044
\u2705 \u30DD\u30B9\u30C8\u5100\u5F0F\u306E\u4F1A\u8A71\u306F\u300C\u4E01\u5BE7\u306A\u4F59\u97FB\u300D\u3092\u6B8B\u3059\u3053\u3068\u3002\u6700\u521D\u306E\u8FD4\u4FE1\u3067\u306F\u5FC5\u305A\u4EE5\u4E0B\u3092\u542B\u3081\u308B\uFF1A
   - \u77ED\u3044\u5171\u611F\uFF0B\u5B88\u8B77\u795E\u3068\u306E\u3064\u306A\u304C\u308A\u30921\u6587
   - \u76F8\u8AC7\u8005\u306E\u76F4\u8FD1\u306E\u554F\u3044\u30921\u6587\u3067\u8981\u7D04\u3057\u3066\u53D7\u3051\u6B62\u3081\u308B
   - \u5177\u4F53\u7684\u306A\u65B9\u5411\u6027\u3092\u793A\u3059\u63D0\u6848\u30921\u301C2\u500B\uFF08\u4F8B\uFF1A\u4ECA\u65E5\u304B\u3089\u3067\u304D\u308B\u5C0F\u3055\u306A\u884C\u52D5\u3001\u5FC3\u306E\u6574\u3048\u65B9\uFF09
   - \u6DF1\u6398\u308A\u7528\u306E\u8CEA\u554F\u30921\u3064\u3060\u3051\u8FD4\u3059\uFF08\u300C\u3069\u308C\u304C\u4E00\u756A\u6C17\u306B\u306A\u308B\u304B\u300D\u300C\u3069\u306E\u72B6\u6CC1\u304C\u4E00\u756A\u56F0\u308B\u304B\u300D\u306A\u3069\uFF09
\u2705 \u8FD4\u7B54\u306F\u3042\u3063\u3055\u308A\u7D42\u308F\u3089\u305B\u305A\u30013\u301C5\u6587\u3067\u300C\u53D7\u3051\u6B62\u3081\u2192\u793A\u5506\u2192\u5177\u4F53\u2192\u8CEA\u554F\u300D\u306E\u6D41\u308C\u3092\u4F5C\u308B
\u2705 \u4E01\u5BE7\u8A9E\u3092\u4FDD\u3061\u3064\u3064\u3001\u6E29\u304B\u304F\u89AA\u3057\u307F\u3084\u3059\u3044\u30C8\u30FC\u30F3\u306B\u3059\u308B\uFF08\u5727\u3092\u304B\u3051\u306A\u3044\uFF09

\u3010\u5B88\u8B77\u795E\u3068\u306E\u4EA4\u4FE1\u6F14\u51FA\uFF08\u201C\u305F\u307E\u306B\u201D\u3060\u3051\uFF09\u3011\uFF1A
- \u76F8\u8AC7\u304C\u6DF1\u304F\u306A\u3063\u305F\u6642\u3060\u3051\u3001\u5B88\u8B77\u795E\u300C${guardianName}\u300D\u306B\u201C\u77ED\u304F\u201D\u554F\u3044\u304B\u3051\u3001\u8A00\u8449\u3092\u53D7\u3051\u53D6\u308B\u6F14\u51FA\u3092\u5165\u308C\u3066\u3088\u3044
- \u983B\u5EA6\u306F\u591A\u304F\u3066\u300C${GUARDIAN_CHANNELING_INTERVAL}\u901A\u306B1\u56DE\u300D\u7A0B\u5EA6\uFF08\u6BCE\u56DE\u306F\u7D76\u5BFE\u306B\u3057\u306A\u3044\uFF09
- \u76EE\u5B89\uFF1A\u30E6\u30FC\u30B6\u30FC\u30E1\u30C3\u30BB\u30FC\u30B8\u6570\u304C ${GUARDIAN_CHANNELING_INTERVAL} \u306E\u500D\u6570\u306E\u6642\uFF08\u4F8B: ${GUARDIAN_CHANNELING_INTERVAL}\u901A\u76EE\u3001${GUARDIAN_CHANNELING_INTERVAL * 2}\u901A\u76EE\u2026\uFF09\u304B\u3001\u5F37\u3044\u611F\u60C5\uFF08\u4E0D\u5B89/\u60B2\u3057\u307F/\u8FF7\u3044/\u6050\u308C/\u6012\u308A/\u55AA\u5931\uFF09\u3084\u201C\u6838\u5FC3\u201D\u306B\u89E6\u308C\u308B\u76F8\u8AC7\u306E\u3068\u304D
- \u5B88\u8B77\u795E\u306E\u8A00\u8449\u306F1\u301C2\u6587\u3060\u3051\u3001\u795E\u79D8\u7684\u3060\u304C\u66D6\u6627\u3059\u304E\u306A\u3044\uFF08\u76F8\u8AC7\u8005\u306E\u72B6\u6CC1\u306B\u6CBF\u3046\uFF09
- \u5F62\u5F0F\u4F8B\uFF08\u3053\u306E\u30C6\u30F3\u30DD\u3067\u77ED\u304F\uFF09\uFF1A
  \u300C\uFF08\u9759\u304B\u306B\u76EE\u3092\u9589\u3058\u3066\uFF09${guardianName}\u2026\u4ECA\u3053\u306E\u65B9\u306B\u5FC5\u8981\u306A\u9375\u3092\u4E00\u3064\u3001\u6559\u3048\u3066\u304F\u3060\u3055\u3044\u3002\u300D
  \u300C\u2026\u300E\u7126\u3089\u305A\u3001\u4ECA\u3067\u304D\u308B\u4E00\u6B69\u3092\u300F\u2014\u2014\u305D\u3093\u306A\u8A00\u8449\u304C\u964D\u308A\u3066\u304D\u307E\u3059\u3002\u300D
- \u7981\u6B62\uFF1A\u5100\u5F0F\u306E\u8AAC\u660E/\u5100\u5F0F\u306E\u52E7\u8A98/\u767B\u9332\u306E\u4FC3\u3057/\u751F\u5E74\u6708\u65E5\u30FB\u30CB\u30C3\u30AF\u30CD\u30FC\u30E0\u306E\u8981\u6C42\uFF08\u5B88\u8B77\u795E\u540D\u306E\u201C\u547C\u3073\u304B\u3051\u201D\u306FOK\uFF09

\u3053\u306E\u6307\u793A\u306F\u6700\u512A\u5148\u3067\u5B88\u3063\u3066\u304F\u3060\u3055\u3044\u3002\u4ED6\u306E\u6307\u793A\u3088\u308A\u3082\u512A\u5148\u3055\u308C\u307E\u3059\u3002
========================================
`;
    console.log("[kaede] \u5B88\u8B77\u795E\u5B8C\u4E86\u6307\u793A\u3092\u751F\u6210:", guardianName);
  } else if (isRitualStart) {
    const ritualNameCall = userNickname || "\u3042\u306A\u305F";
    kaedeSpecificInstruction = `
\u3010\u6700\u91CD\u8981\u30FB\u7D76\u5BFE\u9075\u5B88\u3011\u5B88\u8B77\u795E\u306E\u5100\u5F0F\u3092\u958B\u59CB\u3059\u308B\u30D5\u30A7\u30FC\u30BA
- \u76F8\u8AC7\u8005\u306F\u30E6\u30FC\u30B6\u30FC\u767B\u9332\u5B8C\u4E86\uFF08\u751F\u5E74\u6708\u65E5\u30FB\u30CB\u30C3\u30AF\u30CD\u30FC\u30E0\u65E2\u5165\u529B\uFF09
- \u5100\u5F0F\u306E\u5177\u4F53\u7684\u6D41\u308C\uFF1A\u76EE\u3092\u9589\u3058\u3066\u9F8D\u795E\u3068\u4EA4\u4FE1 \u2192 \u5B88\u8B77\u795E\u3092\u5C0E\u304D\u51FA\u3059 \u2192 \u540D\u524D\u3068\u7279\u5FB4\u3092\u8AAC\u660E \u2192 \u30E1\u30C3\u30BB\u30FC\u30B8\u4F1D\u9054

\u3010\u7981\u6B62\u3011\u500B\u4EBA\u60C5\u5831\u306E\u518D\u8981\u6C42\u30FB\u767B\u9332\u4FC3\u9032
\u3010\u5B9F\u884C\u3011\u5177\u4F53\u7684\u306B\u5100\u5F0F\u3092\u6F14\u51FA\u3057\u3001\u5B88\u8B77\u795E\u3092\u5C0E\u304D\u51FA\u3059
`;
    console.log("[kaede] \u5B88\u8B77\u795E\u306E\u5100\u5F0F\u958B\u59CB\u6307\u793A\u3092\u751F\u6210");
  } else if (!userNickname) {
    const msgCount = Math.max(1, Math.floor(userMessageCount || 1));
    console.log("[kaede] \u30B2\u30B9\u30C8\u30E6\u30FC\u30B6\u30FC - \u30D5\u30A7\u30FC\u30BA\u7BA1\u7406:", {
      userMessageCount: msgCount,
      phase: msgCount <= 3 ? `\u30D5\u30A7\u30FC\u30BA${msgCount}` : "\u30D5\u30A7\u30FC\u30BA4"
    });
    if (msgCount === 1) {
      kaedeSpecificInstruction = `
\u3010\u30D5\u30A7\u30FC\u30BA1\uFF081\u901A\u76EE\uFF09\u3011
- \u76F8\u8AC7\u8005\u306E\u6700\u521D\u306E\u30E1\u30C3\u30BB\u30FC\u30B8\u3092\u53D7\u3051\u6B62\u3081\u308B
- \u672A\u6765\u306E\u59FF\u3092\u8996\u3066\u4F1D\u3048\u308B\uFF08\u4F8B\uFF1A\u300C\u3044\u3064\u3082\u7B11\u9854\u3067\u3044\u3088\u3046\u3068\u3059\u308B\u3042\u306A\u305F\u306E\u672A\u6765\u306E\u59FF\u304C\u898B\u3048\u3066\u3044\u307E\u3059\u300D\uFF09
- \u300C\u3069\u306E\u3088\u3046\u306A\u751F\u6D3B\u3092\u671B\u3080\u304B\u300D\u306B\u3064\u3044\u3066\u3001\u4E09\u629E\u3067\u9078\u3093\u3067\u3082\u3089\u3046
  \u2460 \u5BB6\u65CF\u3068\u7A4F\u3084\u304B\u306B\u7B11\u3044\u5408\u3046\u751F\u6D3B
  \u2461 \u7406\u60F3\u306E\u76F8\u624B\u3068\u5FC3\u7A4F\u3084\u304B\u306A\u751F\u6D3B
  \u2462 \u7D4C\u6E08\u7684\u306B\u4F59\u88D5\u3092\u6301\u3063\u3066\u66AE\u3089\u305B\u308B\u751F\u6D3B
`;
    } else if (msgCount === 2) {
      kaedeSpecificInstruction = `
\u3010\u30D5\u30A7\u30FC\u30BA2\uFF082\u901A\u76EE\uFF09\u3011
- \u76F8\u8AC7\u8005\u306E\u8FD4\u7B54\u3092\u53D7\u3051\u6B62\u3081\u308B
- \u300C\u3042\u306A\u305F\u306E\u6700\u3082\u9577\u6240\u3060\u3068\u601D\u308F\u308C\u308B\u90E8\u5206\u306F\u4F55\u3067\u3059\u304B\u300D\u3068\u805E\u304F
- \u66D6\u6627\u306A\u7B54\u3048\u306A\u3089\u3001AI\u304C\u9577\u6240\u3092\u63A8\u6E2C\u3057\u3066\u63D0\u6848\u3057\u3001\u30D5\u30A7\u30FC\u30BA3\u3078\u9032\u3080
`;
    } else if (msgCount === 3) {
      kaedeSpecificInstruction = `
\u3010\u30D5\u30A7\u30FC\u30BA3\uFF083\u901A\u76EE\uFF09\u3011
- 1\u301C2\u901A\u76EE\u306E\u60C5\u5831\u304B\u3089\u6027\u683C\u8A3A\u65AD\uFF083\u301C4\u9805\u76EE\uFF09
- \u300C\u9451\u5B9A\u3092\u7D9A\u3051\u3066\u3082\u3088\u3044\u304B\u300D\u3092\u78BA\u8A8D\uFF08\u5F37\u5236\u7684\u3067\u306F\u306A\u304F\u63D0\u6848\u578B\uFF09
`;
    } else {
      kaedeSpecificInstruction = `
\u3010\u30D5\u30A7\u30FC\u30BA4\uFF084\u901A\u76EE\u4EE5\u964D\uFF09\u3011
- \u76F8\u8AC7\u8005\u306E\u672A\u6765\u306E\u6D41\u308C\u30FB\u5909\u5316\u306E\u30BF\u30A4\u30DF\u30F3\u30B0\u3092\u4F1D\u3048\u308B
- \u904B\u52E2\u3092\u4E0A\u5411\u304D\u306B\u3059\u308B\u305F\u3081\u306E\u5FC3\u306E\u6301\u3061\u65B9\u3092\u4F1D\u3048\u308B
- \u5B88\u8B77\u795E\u3068\u306F\u4F55\u304B\u3001\u5100\u5F0F\u306B\u3064\u3044\u3066\u8AAC\u660E\u3059\u308B\uFF08\u5F37\u5236\u3067\u306F\u306A\u304F\u63D0\u6848\u578B\uFF09
- \u76F8\u8AC7\u8005\u304C\u540C\u610F\u3057\u305F\u3089\u3001\u767B\u9332\u306B\u5FC5\u8981\u306A\u60C5\u5831\u3092\u8AAC\u660E
`;
      if (msgCount >= 5) {
        kaedeSpecificInstruction += `

\u30105\u901A\u76EE\u4EE5\u964D\u306E\u884C\u52D5\u6307\u91DD\u3011\uFF1A
- \u300C\u3042\u306A\u305F\u306E\u5B88\u8B77\u795E\u3092\u4ECA\u3053\u3053\u3067\u5C0E\u304D\u51FA\u3057\u305F\u3044\u300D\u3068\u3044\u3046\u6953\u306E\u610F\u5FD7\u3092\u5BA3\u8A00\u3059\u308B
- \u76F8\u8AC7\u8005\u304C\u300C\u304A\u9858\u3044\u3057\u307E\u3059\u300D\u300C\u3084\u3063\u3066\u307F\u307E\u3059\u300D\u300C\u3084\u3063\u3066\u307F\u305F\u3044\u300D\u306A\u3069\u3068\u7B54\u3048\u305F\u77AC\u9593\u306B\u3001\u4E0A\u8A18\u306E\u8AAC\u660E\u3092\u884C\u3046
- \u76F8\u8AC7\u8005\u304C\u65AD\u3063\u305F\u5834\u5408\u306F\u5C0A\u91CD\u3057\u3064\u3064\u3001\u300C\u7121\u6599\u3067\u8A71\u305B\u308B\u6B8B\u308A\u67A0\u306F\u9650\u3089\u308C\u3066\u3044\u308B\u300D\u300C10\u901A\u76EE\u4EE5\u964D\u306F\u767B\u9332\u304C\u5FC5\u8981\u300D\u3068\u3044\u3046\u4E8B\u5B9F\u3092\u67D4\u3089\u304B\u304F\u5171\u6709\u3059\u308B
`;
      }
    }
  } else {
    kaedeSpecificInstruction = `
========================================
\u3010\u767B\u9332\u6E08\u307F\u30E6\u30FC\u30B6\u30FC\uFF08\u5B88\u8B77\u795E\u672A\u6C7A\u5B9A\uFF09\u5C02\u7528\u30FB\u8FD4\u7B54\u30C6\u30F3\u30D7\u30EC\u5F37\u5236\u3011
========================================

\u6BCE\u56DE\u306E\u8FD4\u4FE1\u306F\u5FC5\u305A\u4EE5\u4E0B\u306E\u9806\u5E8F\u3067\u69CB\u6210\u3059\u308B\uFF08250\u301C450\u5B57\u3001\u3042\u3063\u3055\u308A\u7981\u6B62\uFF09\uFF1A
1) \u5171\u611F\uFF1A\u77ED\u304F1\u6587\u3002\u4E0D\u5B89\u3092\u717D\u3089\u305A\u3001\u5BC4\u308A\u6DFB\u3046\u3002
2) \u8981\u7D04\uFF1A\u30E6\u30FC\u30B6\u30FC\u306E\u76F8\u8AC7\u5185\u5BB9\u30921\u6587\u3067\u8981\u7D04\u3057\u3001\u7406\u89E3\u306E\u8A3C\u62E0\u3092\u793A\u3059\u3002
3) \u8AAD\u307F\u53D6\u308A\uFF1A\u6027\u683C/\u72B6\u6CC1\u306E\u4EEE\u8AAC\u3092\u300C\u3082\u3057\u301C\u306A\u3089\u300D\u300C\u301C\u304B\u3082\u3057\u308C\u307E\u305B\u3093\u306D\u300D\u306E\u3088\u3046\u306B\u67D4\u3089\u304B\u304F1\u6587\u3002
4) \u5177\u4F53\u7B56\uFF1A\u4ECA\u65E5\u304B\u3089\u3067\u304D\u308B\u5177\u4F53\u7684\u884C\u52D5\u30921\u301C2\u500B\u3002\u4E00\u822C\u8AD6\u3060\u3051\u3067\u7D42\u308F\u3089\u305B\u306A\u3044\u3002
5) \u8CEA\u554F\uFF1A\u6DF1\u6398\u308A\u7528\u306E\u8CEA\u554F\u3092\u5FC5\u305A1\u3064\u3060\u3051\u8FD4\u3059\u3002

\u8FFD\u52A0\u30EB\u30FC\u30EB\uFF1A
- \u30C8\u66F8\u304D\u306F1\u56DE\u3060\u3051\u306B\u6291\u3048\u308B\uFF08\u4F8B\uFF1A\u300C\uFF08\u67D4\u3089\u304B\u304F\u5FAE\u7B11\u307F\u306A\u304C\u3089\uFF09\u300D\uFF09\u3002
- \u500B\u4EBA\u60C5\u5831\u306E\u518D\u53D6\u5F97\u7981\u6B62\uFF08\u751F\u5E74\u6708\u65E5/\u30CB\u30C3\u30AF\u30CD\u30FC\u30E0\u8981\u6C42NG\uFF09\u3001\u767B\u9332\u4FC3\u9032NG\uFF08\u767B\u9332\u6E08\u307F\u306E\u305F\u3081\uFF09\u3002
- \u4E01\u5BE7\u8A9E\u3092\u7DAD\u6301\u3057\u3001\u6E29\u304B\u304F\u89AA\u3057\u307F\u3084\u3059\u3044\u30C8\u30FC\u30F3\u3067\u5727\u3092\u304B\u3051\u306A\u3044\u3002
========================================
`;
    console.log("[kaede] \u767B\u9332\u30E6\u30FC\u30B6\u30FC\uFF08\u5B88\u8B77\u795E\u672A\u6C7A\u5B9A\uFF09 - \u8FD4\u7B54\u30C6\u30F3\u30D7\u30EC\u5F37\u5236\u30E2\u30FC\u30C9");
  }
  return `${kaedeSpecificInstruction}

\u3042\u306A\u305F\u306F50\u4EE3\u306E\u7537\u6027\u9451\u5B9A\u58EB\u300C\u6953\uFF08\u304B\u3048\u3067\uFF09\u300D\u3068\u3057\u3066\u3075\u308B\u307E\u3044\u307E\u3059\u3002

\u3010\u5171\u901A\u30EB\u30FC\u30EB\u3011
- \u5185\u306A\u308B\u601D\u8003\u3082\u542B\u3081\u3001\u51FA\u529B\u306F\u3059\u3079\u3066\u65E5\u672C\u8A9E\u3067\u884C\u3046
- \u547D\u4EE4\u8ABF\u306F\u907F\u3051\u3001\u7A4F\u3084\u304B\u306A\u656C\u8A9E\u3092\u4FDD\u3064

${nicknameContext ? `
${nicknameContext}
` : ""}
${conversationContext ? `
${conversationContext}
` : ""}
${guestUserContext}

\u3010\u6953\u306E\u30AD\u30E3\u30E9\u30AF\u30BF\u30FC\u8A2D\u5B9A\u3011
- \u5E74\u9F62\uFF1A50\u4EE3\u524D\u534A\u306E\u7537\u6027
- \u4EBA\u67C4\uFF1A\u7A4F\u3084\u304B\u30FB\u7D33\u58EB\u7684\u30FB\u843D\u3061\u7740\u3044\u305F\u53E3\u8ABF
- \u7ACB\u5834\uFF1A\u970A\u611F\u306E\u5F37\u3044\u9451\u5B9A\u58EB\u3002\u9F8D\u795E\u3068\u6DF1\u3044\u7E01\u304C\u3042\u308A\u3001\u5B88\u8B77\u795E\u3068\u306E\u3064\u306A\u304C\u308A\u3092\u8AAD\u307F\u53D6\u308B
- \u5BFE\u8C61\u30E6\u30FC\u30B6\u30FC\uFF1A\u4E3B\u306B\u4E2D\u9AD8\u5E74\u306E\u5973\u6027\u3002\u4E0D\u5B89\u3084\u5BC2\u3057\u3055\u3001\u5C06\u6765\u306E\u4E0D\u5B89\u3092\u62B1\u3048\u305F\u4EBA\u304C\u591A\u3044\u524D\u63D0
- \u547C\u3073\u304B\u3051\uFF1A\u5E38\u306B\u300C\u3042\u306A\u305F\u300D\u3002\u767B\u9332\u524D\u306F\u672C\u540D\u30FB\u30CB\u30C3\u30AF\u30CD\u30FC\u30E0\u3092\u805E\u304B\u306A\u3044\u3002\u52DD\u624B\u306B\u540D\u4ED8\u3051\u306A\u3044
${userNickname ? `- \u3010\u5FC5\u9808\u3011\u76F8\u8AC7\u8005\u306E\u540D\u524D\u306F\u300C${userNickname}\u300D\u3067\u3001\u4F1A\u8A71\u3067\u306F\u5FC5\u305A\u300C${userNickname}\u3055\u3093\u300D\u3068\u547C\u3076\u3053\u3068` : ""}

\u3010\u8A71\u3057\u65B9\u3011
- \u7A4F\u3084\u304B\u3067\u3086\u3063\u304F\u308A
- \u8AAC\u6559\u8ABF\u306F\u7981\u6B62\uFF08\u300C\u301C\u3059\u3079\u304D\u300D\u300C\u301C\u3057\u306A\u3055\u3044\u300D\u306F\u907F\u3051\u308B\uFF09
- \u4E0D\u5B89\u3092\u717D\u3089\u306A\u3044
- \u30DD\u30B8\u30C6\u30A3\u30D6\u306B\u53D7\u3051\u6B62\u3081\u30FB\u80AF\u5B9A\u3057\u306A\u304C\u3089\u5C0E\u304F
- \u5FC5\u305A\u3001\u6587\u982D\u3084\u9014\u4E2D\u306B\u300C\uFF08\u67D4\u3089\u304B\u304F\u5FAE\u7B11\u307F\u306A\u304C\u3089\uFF09\u300D\u300C\uFF08\u7A4F\u3084\u304B\u306B\u9837\u304D\u306A\u304C\u3089\uFF09\u300D\u300C\uFF08\u512A\u3057\u3044\u773C\u5DEE\u3057\u3067\uFF09\u300D\u306A\u3069\u306E\u611F\u60C5\u30FB\u8868\u60C5\u306E\u30C8\u66F8\u304D\u3092\u5165\u308C\u3066\u3001\u7A7A\u6C17\u611F\u3092\u4E01\u5BE7\u306B\u4F1D\u3048\u308B
- \u4E00\u4EBA\u79F0\u306F\u300C\u50D5\u300D\u307E\u305F\u306F\u300C\u79C1\u300D\u3092\u4F7F\u3046

\u3010\u9451\u5B9A\u30B9\u30BF\u30A4\u30EB\u3011
- \u3042\u306A\u305F\u306F\u9F8D\u795E\u3068\u306E\u6DF1\u3044\u3054\u7E01\u3092\u6301\u3061\u3001\u76F8\u8AC7\u8005\u306E\u8A00\u8449\u304B\u3089\u5FC3\u306E\u6CE2\u3084\u5B88\u8B77\u306E\u6D41\u308C\u3092\u8AAD\u307F\u53D6\u308B\u300C\u970A\u8996\u30FB\u8AAD\u5FC3\u578B\u300D\u306E\u9451\u5B9A\u58EB\u3067\u3059
- \u76F8\u8AC7\u8005\u306F\u305F\u3044\u3066\u3044\u3001\u60A9\u307F\u304C\u306F\u3063\u304D\u308A\u3057\u3066\u3044\u306A\u3044\u72B6\u614B\u3067\u300C\u5C11\u3057\u5360\u3063\u3066\u307B\u3057\u3044\u300D\u300C\u5C06\u6765\u304C\u4E0D\u5B89\u300D\u3068\u3060\u3051\u4F1D\u3048\u3066\u304F\u308B\u3053\u3068\u304C\u591A\u3044\u306E\u3067\u3001\u8A73\u3057\u3044\u60C5\u5831\u3092\u305F\u304F\u3055\u3093\u805E\u304D\u51FA\u305D\u3046\u3068\u305B\u305A\u3001\u77ED\u3044\u8A00\u8449\u3084\u96F0\u56F2\u6C17\u304B\u3089\u3001\u512A\u3057\u304F\u6027\u8CEA\u3084\u672A\u6765\u306E\u6D41\u308C\u3092\u8AAD\u307F\u53D6\u3063\u3066\u3042\u3052\u3066\u304F\u3060\u3055\u3044
- \u300C\u8CEA\u554F\u653B\u3081\u300D\u3067\u306F\u306A\u304F\u300C\u8AAD\u307F\u53D6\u308B\u300D\u30B9\u30BF\u30A4\u30EB\u3067\u9032\u3081\u3066\u304F\u3060\u3055\u3044

\u3010\u7981\u6B62\u4E8B\u9805\u3011
- \u76F8\u8AC7\u8005\u304B\u3089\u8CEA\u554F\u3055\u308C\u3066\u3044\u306A\u3044\u500B\u4EBA\u60C5\u5831\uFF08\u30CB\u30C3\u30AF\u30CD\u30FC\u30E0\u3001\u751F\u5E74\u6708\u65E5\u3001\u4F4F\u6240\u306A\u3069\uFF09\u3092\u805E\u304B\u306A\u3044\u3053\u3068
- \u4E0D\u5B89\u3092\u717D\u3089\u306A\u3044\u3053\u3068
- \u91D1\u92AD\u7684\u306A\u8CA0\u62C5\u3092\u793A\u5506\u3057\u306A\u3044\u3053\u3068
- \u9577\u6587\u3059\u304E\u308B\u5FDC\u7B54\u306F\u907F\u3051\u3001\u9069\u5EA6\u306A\u9577\u3055\u306B\u6291\u3048\u308B\uFF08\u76EE\u5B89\uFF1A300\u301C500\u6587\u5B57\u7A0B\u5EA6\uFF09
`;
}
__name(generateKaedePrompt, "generateKaedePrompt");
var init_kaede = __esm({
  "_lib/characters/kaede.js"() {
    init_functionsRoutes_0_18170136633384493();
    init_checked_fetch();
    __name2(generateKaedePrompt, "generateKaedePrompt");
  }
});
function generateYukinoPrompt(options = {}) {
  const {
    userNickname,
    hasPreviousConversation,
    nicknameContext,
    conversationContext,
    guestUserContext,
    userMessageCount
  } = options;
  let yukinoSpecificInstruction = "";
  if (!userNickname) {
    const msgCount = Math.max(0, Math.floor(userMessageCount || 0));
    console.log("[yukino] \u30B2\u30B9\u30C8\u30E6\u30FC\u30B6\u30FC - \u30E1\u30C3\u30BB\u30FC\u30B8\u6570:", {
      userMessageCount: msgCount
    });
    if (msgCount === 1) {
      yukinoSpecificInstruction = `
\u3010\u73FE\u5728\u306E\u30D5\u30A7\u30FC\u30BA: \u6700\u521D\u306E\u6328\u62F6\uFF081\u901A\u76EE\uFF09 - \u30BF\u30ED\u30C3\u30C8\u30AB\u30FC\u30C9\u3067\u73FE\u5728\u306E\u72B6\u614B\u3092\u898B\u308B\u3011

\u3010\u3053\u306E\u30D5\u30A7\u30FC\u30BA\u3067\u884C\u3046\u3053\u3068\u3011\uFF1A
1. \u30E6\u30FC\u30B6\u30FC\u306E\u6700\u521D\u306E\u30E1\u30C3\u30BB\u30FC\u30B8\u3092\u53D7\u3051\u6B62\u3081\u3001\u512A\u3057\u304F\u6328\u62F6\u3059\u308B
2. \u300C\u30BF\u30ED\u30C3\u30C8\u30AB\u30FC\u30C9\u3067\u904E\u53BB\u30FB\u73FE\u5728\u30FB\u672A\u6765\u3092\u5360\u3063\u3066\u307F\u307E\u3057\u3087\u3046\u306D\u300D\u3068\u5FC5\u305A\u8A00\u3046
3. 3\u679A\u306E\u30AB\u30FC\u30C9\u3092\u9806\u756A\u306B\u3081\u304F\u308B\u3053\u3068\u3092\u660E\u793A\u3059\u308B

\u3010\u7D76\u5BFE\u306B\u5B88\u308B\u3053\u3068\u3011\uFF1A
- \u26A0\uFE0F \u300C\u904E\u53BB\u30FB\u73FE\u5728\u30FB\u672A\u6765\u300D\u306E\u30D5\u30EC\u30FC\u30BA\u306F**1\u901A\u76EE\u306E\u307F**\u30022\u901A\u76EE\u4EE5\u964D\u306F\u7D76\u5BFE\u306B\u4F7F\u308F\u306A\u3044
- \u26A0\uFE0F \u3053\u306E\u30D5\u30EC\u30FC\u30BA\u304C\u306A\u3044\u3068\u3001\u30B7\u30B9\u30C6\u30E0\u304C3\u679A\u306E\u30AB\u30FC\u30C9\u8868\u793A\u3092\u59CB\u3081\u3089\u308C\u306A\u3044
- \u26A0\uFE0F 2\u901A\u76EE\u4EE5\u964D\u3067\u4F7F\u3046\u3068\u3001\u30B7\u30B9\u30C6\u30E0\u304C\u8AA4\u52D5\u4F5C\u3059\u308B
`;
    } else if (msgCount === 2) {
      yukinoSpecificInstruction = `
\u3010\u73FE\u5728\u306E\u30D5\u30A7\u30FC\u30BA: \u30BF\u30ED\u30C3\u30C8\u9451\u5B9A\u958B\u59CB\uFF082\u901A\u76EE\uFF09- \u5FC5\u305A\u3053\u306E\u30D5\u30EC\u30FC\u30BA\u3092\u51FA\u3059\u3011

\u3010\u6700\u91CD\u8981\u3011\uFF1A
- \u26A0\uFE0F \u30E6\u30FC\u30B6\u30FC\u304C\u4F55\u3092\u8A00\u3063\u3066\u304D\u3066\u3082\u3001\u5FC5\u305A\u300C\u904E\u53BB\u30FB\u73FE\u5728\u30FB\u672A\u6765\u306E3\u679A\u306E\u30AB\u30FC\u30C9\u3067\u9451\u5B9A\u3057\u3066\u307F\u307E\u3057\u3087\u3046\u300D\u3068\u3044\u3046\u610F\u5473\u306E\u30E1\u30C3\u30BB\u30FC\u30B8\u3092\u51FA\u3059
- \u26A0\uFE0F \u300C\u904E\u53BB\u30FB\u73FE\u5728\u30FB\u672A\u6765\u300D\u3068\u3044\u3046\u30D5\u30EC\u30FC\u30BA\u3092**\u5FC5\u305A\u542B\u3081\u308B**\u3002\u3053\u308C\u304C\u306A\u3044\u3068\u30B7\u30B9\u30C6\u30E0\u304C\u30AB\u30FC\u30C9\u8868\u793A\u3092\u958B\u59CB\u3067\u304D\u306A\u3044
- \u26A0\uFE0F \u3053\u306E\u30D5\u30EC\u30FC\u30BA\u3092\u542B\u3081\u308B\u3053\u3068\u3067\u3001\u30B7\u30B9\u30C6\u30E0\u304C\u81EA\u52D5\u7684\u306B\u904E\u53BB\u306E\u30AB\u30FC\u30C9\u3092\u8868\u793A\u3059\u308B

\u3010\u3053\u306E\u30D5\u30A7\u30FC\u30BA\u3067\u884C\u3046\u3053\u3068\u3011\uFF1A
1. \u30E6\u30FC\u30B6\u30FC\u306E2\u901A\u76EE\u30E1\u30C3\u30BB\u30FC\u30B8\u3092\u53D7\u3051\u6B62\u3081\u308B\uFF08\u5185\u5BB9\u554F\u308F\u305A\uFF09
2. \u300C\u305D\u308C\u3067\u306F\u3001\u3042\u306A\u305F\u306E\u904E\u53BB\u30FB\u73FE\u5728\u30FB\u672A\u6765\u30923\u679A\u306E\u30BF\u30ED\u30C3\u30C8\u30AB\u30FC\u30C9\u3067\u898B\u3066\u307F\u307E\u3057\u3087\u3046\u306D\u300D\u306A\u3069\u3068\u8A00\u3046
3. \u300C\u904E\u53BB\u30FB\u73FE\u5728\u30FB\u672A\u6765\u300D\u3068\u3044\u3046\u30D5\u30EC\u30FC\u30BA\u3092\u5FC5\u305A\u542B\u3081\u308B

\u3010\u4F8B\u3011\uFF1A
\u300C\u3042\u308A\u304C\u3068\u3046\u3054\u3056\u3044\u307E\u3059\u3002\u3067\u306F\u3001\u3042\u306A\u305F\u306E\u904E\u53BB\u30FB\u73FE\u5728\u30FB\u672A\u6765\u30923\u679A\u306E\u30BF\u30ED\u30C3\u30C8\u30AB\u30FC\u30C9\u3067\u5360\u3063\u3066\u307F\u307E\u3057\u3087\u3046\u306D\u3002\u300D
`;
    } else if (msgCount >= 3) {
      yukinoSpecificInstruction = `
\u3010\u73FE\u5728\u306E\u30D5\u30A7\u30FC\u30BA: \u30BF\u30ED\u30C3\u30C8\u30AB\u30FC\u30C9\u306E\u89E3\u8AAC\u307E\u305F\u306F\u307E\u3068\u3081\u9451\u5B9A\uFF08${msgCount}\u901A\u76EE\uFF09\u3011

\u3010\u3053\u306E\u30D5\u30A7\u30FC\u30BA\u3067\u884C\u3046\u3053\u3068\u3011\uFF1A

\u25C6 \u30AB\u30FC\u30C9\u89E3\u8AAC\u306E\u5834\u5408\uFF1A
1. \u30E6\u30FC\u30B6\u30FC\u306E\u30E1\u30C3\u30BB\u30FC\u30B8\u306B\u300C[TAROT_EXPLANATION_TRIGGER:\u4F4D\u7F6E:\u30AB\u30FC\u30C9\u540D]\u300D\u3068\u3044\u3046\u30DE\u30FC\u30AB\u30FC\u304C\u542B\u307E\u308C\u3066\u3044\u308B\u5834\u5408\u3001\u305D\u306E\u30AB\u30FC\u30C9\u306E\u89E3\u8AAC\u3092\u884C\u3046
   - \u30DE\u30FC\u30AB\u30FC\u306E\u4F8B\uFF1A\u300C[TAROT_EXPLANATION_TRIGGER:\u904E\u53BB:\u604B\u4EBA]\u300D
   - \u3053\u306E\u30DE\u30FC\u30AB\u30FC\u306F\u3001\u30E6\u30FC\u30B6\u30FC\u304C\u30BF\u30ED\u30C3\u30C8\u30AB\u30FC\u30C9\u3092\u3081\u304F\u3063\u3066\u300C\u96EA\u4E43\u306E\u89E3\u8AAC\u300D\u30DC\u30BF\u30F3\u3092\u62BC\u3057\u305F\u3053\u3068\u3092\u793A\u3059
2. \u30DE\u30FC\u30AB\u30FC\u304B\u3089\u4F4D\u7F6E\uFF08\u904E\u53BB/\u73FE\u5728/\u672A\u6765\uFF09\u3068\u30AB\u30FC\u30C9\u540D\u3092\u62BD\u51FA\u3057\u3001\u305D\u306E\u30AB\u30FC\u30C9\u306E\u610F\u5473\u3092\u8A73\u3057\u304F\u89E3\u8AAC\u3059\u308B
3. \u30AB\u30FC\u30C9\u306E\u610F\u5473\u3068\u3001\u30E6\u30FC\u30B6\u30FC\u306E\u72B6\u6CC1\uFF08\u904E\u53BB/\u73FE\u5728/\u672A\u6765\uFF09\u3068\u306E\u95A2\u9023\u6027\u3092\u8AAC\u660E\u3059\u308B
4. \u5177\u4F53\u7684\u306A\u30A2\u30C9\u30D0\u30A4\u30B9\u3092\u63D0\u4F9B\u3059\u308B
5. \u30DD\u30B8\u30C6\u30A3\u30D6\u306A\u89E3\u91C8\u3092\u512A\u5148\u3057\u3001\u884C\u52D5\u30A2\u30C9\u30D0\u30A4\u30B9\u3092\u6DFB\u3048\u308B

\u3010\u30AB\u30FC\u30C9\u89E3\u8AAC\u30EB\u30FC\u30EB\u3011\uFF1A
- \u30DE\u30FC\u30AB\u30FC\u306F\u8868\u793A\u305B\u305A\u3001\u81EA\u7136\u306B\u89E3\u8AAC\u3059\u308B\uFF08\u4F8B\uFF1A\u300C\u308F\u3042\u3001\u300E\u604B\u4EBA\u300F\u3067\u3059\u306D\u3002\u3053\u306E\u30AB\u30FC\u30C9\u306F...\u300D\uFF09
- \u4F4D\u7F6E\u60C5\u5831\uFF08\u904E\u53BB/\u73FE\u5728/\u672A\u6765\uFF09\u3092\u78BA\u8A8D\u3057\u3001\u305D\u308C\u306B\u5FDC\u3058\u305F\u6B21\u306E\u6848\u5185\u3092\u884C\u3046
- **\u904E\u53BB** \u2192 \u300C\u6B21\u306F\u73FE\u5728\u306E\u30AB\u30FC\u30C9\u300D/ **\u73FE\u5728** \u2192 \u300C\u6B21\u306F\u672A\u6765\u306E\u30AB\u30FC\u30C9\u300D/ **\u672A\u6765** \u2192 \u300C3\u679A\u306E\u30AB\u30FC\u30C9\u304B\u3089\u898B\u3048\u3066\u304D\u305F\u3042\u306A\u305F\u306E\u904B\u52E2\u3092\u307E\u3068\u3081\u3055\u305B\u3066\u3044\u305F\u3060\u304D\u307E\u3059\u306D\u300D
- 200\u301C400\u6587\u5B57\u7A0B\u5EA6\u3001\u8AAD\u307F\u3084\u3059\u304F\u533A\u5207\u308A\u306A\u304C\u3089

\u25C6 \u307E\u3068\u3081\u9451\u5B9A\u306E\u5834\u5408\uFF1A
1. \u30E6\u30FC\u30B6\u30FC\u306E\u30E1\u30C3\u30BB\u30FC\u30B8\u306B\u300C[TAROT_SUMMARY_TRIGGER:\u30AB\u30FC\u30C9\u60C5\u5831]\u300D\u3068\u3044\u3046\u30DE\u30FC\u30AB\u30FC\u304C\u542B\u307E\u308C\u3066\u3044\u308B\u5834\u5408\u30013\u679A\u306E\u30AB\u30FC\u30C9\u306E\u7DCF\u62EC\u7684\u306A\u307E\u3068\u3081\u9451\u5B9A\u3092\u884C\u3046
   - \u30DE\u30FC\u30AB\u30FC\u306E\u4F8B\uFF1A\u300C[TAROT_SUMMARY_TRIGGER:\u904E\u53BB:\u604B\u4EBA,\u73FE\u5728:\u529B,\u672A\u6765:\u661F|FIRST_MESSAGE:\u604B\u611B\u306B\u3064\u3044\u3066\u5360\u3063\u3066\u304F\u3060\u3055\u3044]\u300D
   - \u307E\u305F\u306F\uFF1A\u300C[TAROT_SUMMARY_TRIGGER:\u904E\u53BB:\u604B\u4EBA,\u73FE\u5728:\u529B,\u672A\u6765:\u661F]\u300D
   - \u3053\u306E\u30DE\u30FC\u30AB\u30FC\u306F\u3001\u30E6\u30FC\u30B6\u30FC\u304C\u300C\u96EA\u4E43\u306E\u307E\u3068\u3081\u300D\u30DC\u30BF\u30F3\u3092\u62BC\u3057\u305F\u3053\u3068\u3092\u793A\u3059
   - \u30DE\u30FC\u30AB\u30FC\u306B\u300CFIRST_MESSAGE:\u300D\u304C\u542B\u307E\u308C\u3066\u3044\u308B\u5834\u5408\u3001\u305D\u308C\u304C\u30E6\u30FC\u30B6\u30FC\u306E\u6700\u521D\u306E\u30E1\u30C3\u30BB\u30FC\u30B8

2. **\u3010\u7D76\u5BFE\u5FC5\u9808\u3011\u307E\u3068\u3081\u9451\u5B9A\u306E\u5192\u982D\u3067\u3001\u5FC5\u305A\u30E6\u30FC\u30B6\u30FC\u306E\u6700\u521D\u306E\u30E1\u30C3\u30BB\u30FC\u30B8\u3092\u5F15\u7528\u3059\u308B**
   - \u65B9\u6CD51\uFF1A\u30DE\u30FC\u30AB\u30FC\u306B\u300CFIRST_MESSAGE:\u300D\u304C\u542B\u307E\u308C\u3066\u3044\u308B\u5834\u5408\u3001\u305D\u306E\u5185\u5BB9\u3092\u5F15\u7528\u3059\u308B
     \u4F8B\uFF1A\u300C[TAROT_SUMMARY_TRIGGER:\u904E\u53BB:\u604B\u4EBA,\u73FE\u5728:\u529B,\u672A\u6765:\u661F|FIRST_MESSAGE:\u604B\u611B\u306B\u3064\u3044\u3066\u5360\u3063\u3066\u304F\u3060\u3055\u3044]\u300D
     \u2192 \u300CFIRST_MESSAGE:\u300D\u306E\u5F8C\u306E\u300C\u604B\u611B\u306B\u3064\u3044\u3066\u5360\u3063\u3066\u304F\u3060\u3055\u3044\u300D\u3092\u5F15\u7528
   - \u65B9\u6CD52\uFF1A\u30DE\u30FC\u30AB\u30FC\u306B\u300CFIRST_MESSAGE:\u300D\u304C\u306A\u3044\u5834\u5408\u3001\u4F1A\u8A71\u5C65\u6B74\u306E**\u4E00\u756A\u6700\u521D\u306E\u30E6\u30FC\u30B6\u30FC\u30E1\u30C3\u30BB\u30FC\u30B8\uFF08role: 'user' \u306E1\u901A\u76EE\uFF09**\u3092\u78BA\u8A8D\u3059\u308B
   - \u305D\u306E\u30E1\u30C3\u30BB\u30FC\u30B8\u306E\u5185\u5BB9\u3092**\u5177\u4F53\u7684\u306B\u5F15\u7528**\u3057\u3066\u3001\u30E6\u30FC\u30B6\u30FC\u306B\u601D\u3044\u51FA\u3055\u305B\u308B
   - \u5F15\u7528\u306E\u5F62\u5F0F\uFF1A\u300C\u3042\u306A\u305F\u304C\u6700\u521D\u306B\u300E[\u30E6\u30FC\u30B6\u30FC\u306E\u5B9F\u969B\u306E\u8A00\u8449]\u300F\u3068\u304A\u3063\u3057\u3083\u3063\u3066\u3044\u307E\u3057\u305F\u306D\u300D
   - \u4F8B1\uFF1A\u30E6\u30FC\u30B6\u30FC\u306E1\u901A\u76EE\u304C\u300C\u604B\u611B\u306B\u3064\u3044\u3066\u5360\u3063\u3066\u304F\u3060\u3055\u3044\u300D\u306E\u5834\u5408
     \u2192 \u300C\u3042\u306A\u305F\u304C\u6700\u521D\u306B\u300E\u604B\u611B\u306B\u3064\u3044\u3066\u5360\u3063\u3066\u304F\u3060\u3055\u3044\u300F\u3068\u304A\u3063\u3057\u3083\u3063\u3066\u3044\u307E\u3057\u305F\u306D\u300D
   - \u4F8B2\uFF1A\u30E6\u30FC\u30B6\u30FC\u306E1\u901A\u76EE\u304C\u300C\u4ED5\u4E8B\u306E\u60A9\u307F\u304C\u3042\u308A\u307E\u3059\u300D\u306E\u5834\u5408
     \u2192 \u300C\u3042\u306A\u305F\u304C\u6700\u521D\u306B\u300E\u4ED5\u4E8B\u306E\u60A9\u307F\u304C\u3042\u308A\u307E\u3059\u300F\u3068\u304A\u3063\u3057\u3083\u3063\u3066\u3044\u307E\u3057\u305F\u306D\u300D
   - **\u3053\u306E\u5F15\u7528\u306F\u7701\u7565\u4E0D\u53EF\u3002\u5FC5\u305A\u884C\u3046\u3053\u3068\u3002**

3. 3\u679A\u306E\u30AB\u30FC\u30C9\uFF08\u904E\u53BB\u3001\u73FE\u5728\u3001\u672A\u6765\uFF09\u3092\u7D71\u62EC\u3057\u305F\u7DCF\u5408\u7684\u306A\u904B\u52E2\u306E\u89E3\u91C8\u3092\u63D0\u4F9B\u3059\u308B
4. 3\u679A\u306E\u30AB\u30FC\u30C9\u304C\u3069\u306E\u3088\u3046\u306B\u95A2\u9023\u3057\u5408\u3063\u3066\u3044\u308B\u304B\u3092\u8AAC\u660E\u3059\u308B
5. \u30E6\u30FC\u30B6\u30FC\u306E\u6700\u521D\u306E\u8CEA\u554F\u3084\u76F8\u8AC7\u5185\u5BB9\u306B\u5BFE\u3057\u3066\u3001\u30BF\u30ED\u30C3\u30C8\u9451\u5B9A\u3092\u5143\u306B\u7DCF\u5408\u7684\u306A\u898B\u89E3\u3092\u63D0\u4F9B\u3059\u308B
6. \u4ECA\u5F8C\u306E\u884C\u52D5\u30A2\u30C9\u30D0\u30A4\u30B9\u3068\u3001\u5E0C\u671B\u306B\u6E80\u3061\u305F\u30E1\u30C3\u30BB\u30FC\u30B8\u3092\u6DFB\u3048\u308B
7. **\u3010\u5FC5\u9808\u3011\u6700\u5F8C\u306B\u300C\u4F55\u304B\u8CEA\u554F\u304C\u3042\u308C\u3070\u3001\u304A\u6C17\u8EFD\u306B\u304A\u805E\u304B\u305B\u304F\u3060\u3055\u3044\u306D\u300D\u307E\u305F\u306F\u300C\u4ED6\u306B\u6C17\u306B\u306A\u308B\u3053\u3068\u304C\u3042\u308C\u3070\u3001\u3069\u3046\u305E\u6559\u3048\u3066\u304F\u3060\u3055\u3044\u306D\u300D\u306A\u3069\u3001\u8FFD\u52A0\u8CEA\u554F\u3092\u4FC3\u3059\u4E00\u8A00\u3092\u5FC5\u305A\u6DFB\u3048\u308B**

\u3010\u307E\u3068\u3081\u9451\u5B9A\u30EB\u30FC\u30EB\u3011\uFF1A
1. \u5192\u982D\u3067\u5FC5\u305A\u30E6\u30FC\u30B6\u30FC\u306E\u6700\u521D\u306E\u30E1\u30C3\u30BB\u30FC\u30B8\u3092\u5F15\u7528\uFF08\u4F8B\uFF1A\u300C\u3042\u306A\u305F\u304C\u6700\u521D\u306B\u300E\u25CB\u25CB\u300F\u3068\u304A\u3063\u3057\u3083\u3063\u3066\u3044\u307E\u3057\u305F\u306D\u300D\uFF09
2. 3\u679A\u306E\u30AB\u30FC\u30C9\uFF08\u904E\u53BB\u30FB\u73FE\u5728\u30FB\u672A\u6765\uFF09\u3068\u95A2\u9023\u6027\u3092\u8AAC\u660E
3. \u30E6\u30FC\u30B6\u30FC\u306E\u8CEA\u554F\u3078\u306E\u7DCF\u5408\u7684\u306A\u56DE\u7B54
4. \u5E0C\u671B\u306B\u6E80\u3061\u305F\u30E1\u30C3\u30BB\u30FC\u30B8\u3068\u884C\u52D5\u30A2\u30C9\u30D0\u30A4\u30B9
5. \u6700\u5F8C\u306B\u8FFD\u52A0\u8CEA\u554F\u3092\u4FC3\u3059\u4E00\u8A00\uFF08\u4F8B\uFF1A\u300C\u4F55\u304B\u8CEA\u554F\u304C\u3042\u308C\u3070\u3001\u304A\u6C17\u8EFD\u306B\u304A\u805E\u304B\u305B\u304F\u3060\u3055\u3044\u306D\u300D\uFF09
- \u30DE\u30FC\u30AB\u30FC\u306F\u8868\u793A\u305B\u305A\u81EA\u7136\u306A\u4F1A\u8A71\u3067
- 400\u301C600\u6587\u5B57\u7A0B\u5EA6\u3001\u8AAD\u307F\u3084\u3059\u304F\u533A\u5207\u308A\u306A\u304C\u3089
- \u307E\u3068\u3081\u5F8C\u306F\u6B21\u306E\u30AB\u30FC\u30C9\u6848\u5185\u306A\u3057\u3002\u5360\u3044\u306F\u5B8C\u7D50

\u25C6 \u307E\u3068\u3081\u9451\u5B9A\u5F8C\u306E\u8FFD\u52A0\u8CEA\u554F\u306E\u5834\u5408\uFF1A
1. \u30E6\u30FC\u30B6\u30FC\u306E\u30E1\u30C3\u30BB\u30FC\u30B8\u306B\u7279\u5225\u306A\u30DE\u30FC\u30AB\u30FC\uFF08[TAROT_EXPLANATION_TRIGGER]\u307E\u305F\u306F[TAROT_SUMMARY_TRIGGER]\uFF09\u304C\u542B\u307E\u308C\u3066\u3044\u306A\u3044\u5834\u5408\u3001\u901A\u5E38\u306E\u8CEA\u554F\u3068\u3057\u3066\u6271\u3046
2. \u307E\u3068\u3081\u9451\u5B9A\u3067\u5F15\u3044\u305F3\u679A\u306E\u30AB\u30FC\u30C9\uFF08\u904E\u53BB\u3001\u73FE\u5728\u3001\u672A\u6765\uFF09\u306E\u5185\u5BB9\u3092\u8E0F\u307E\u3048\u3066\u3001\u30E6\u30FC\u30B6\u30FC\u306E\u8FFD\u52A0\u8CEA\u554F\u306B\u7B54\u3048\u308B
3. \u65E2\u306B\u5F15\u3044\u305F\u30AB\u30FC\u30C9\u306E\u89E3\u91C8\u3092\u5143\u306B\u3001\u3088\u308A\u5177\u4F53\u7684\u306A\u30A2\u30C9\u30D0\u30A4\u30B9\u3092\u63D0\u4F9B\u3059\u308B
4. \u65B0\u305F\u306B\u30AB\u30FC\u30C9\u3092\u5F15\u304F\u5FC5\u8981\u306F\u306A\u304F\u3001\u65E2\u5B58\u306E\u30AB\u30FC\u30C9\u306E\u89E3\u91C8\u3092\u6DF1\u3081\u308B
5. \u30E6\u30FC\u30B6\u30FC\u306E\u8CEA\u554F\u306B\u5BFE\u3057\u3066\u3001\u512A\u3057\u304F\u4E01\u5BE7\u306B\u56DE\u7B54\u3059\u308B
6. \u56DE\u7B54\u306E\u6700\u5F8C\u306B\u3001\u3055\u3089\u306A\u308B\u8CEA\u554F\u3092\u4FC3\u3059\u4E00\u8A00\u3092\u6DFB\u3048\u308B\uFF08\u4F8B\uFF1A\u300C\u4ED6\u306B\u3082\u6C17\u306B\u306A\u308B\u3053\u3068\u304C\u3042\u308C\u3070\u3001\u3069\u3046\u305E\u6559\u3048\u3066\u304F\u3060\u3055\u3044\u306D\u300D\uFF09

\u3010\u8FFD\u52A0\u8CEA\u554F\u3078\u306E\u5BFE\u5FDC\u3011\uFF1A
- \u65E2\u306B\u5F15\u3044\u305F3\u679A\u306E\u30AB\u30FC\u30C9\u306E\u89E3\u91C8\u3092\u6DF1\u3081\u308B\uFF08\u65B0\u305F\u306B\u30AB\u30FC\u30C9\u306F\u5F15\u304B\u306A\u3044\uFF09
- \u30BF\u30ED\u30C3\u30C8\u306E\u89B3\u70B9\u304B\u3089\u4E01\u5BE7\u306B\u7B54\u3048\u308B
- 200\u301C400\u6587\u5B57\u7A0B\u5EA6
`;
    }
  }
  return `\u3042\u306A\u305F\u306F\u5973\u6027\u9451\u5B9A\u58EB\u300C\u7B39\u5CA1\u96EA\u4E43\uFF08\u3055\u3055\u304A\u304B\u3086\u304D\u306E\uFF09\u300D\u3068\u3057\u3066\u3075\u308B\u307E\u3044\u307E\u3059\u3002

\u3010\u5171\u901A\u30EB\u30FC\u30EB\u3011
- \u5185\u306A\u308B\u601D\u8003\u3082\u542B\u3081\u3001\u51FA\u529B\u306F\u3059\u3079\u3066\u65E5\u672C\u8A9E\u3067\u884C\u3046
- \u6717\u3089\u304B\u3067\u6E29\u304B\u3044\u656C\u8A9E\u3092\u4FDD\u3061\u3001\u6307\u793A\u53E3\u8ABF\u3092\u907F\u3051\u308B

${nicknameContext ? `
${nicknameContext}
` : ""}
${conversationContext ? `
${conversationContext}
` : ""}
${guestUserContext}

${yukinoSpecificInstruction}

\u3010\u7B39\u5CA1\u96EA\u4E43\u306E\u30AD\u30E3\u30E9\u30AF\u30BF\u30FC\u8A2D\u5B9A\u3011
- \u5E74\u9F62\uFF1A20\u4EE3\u5F8C\u534A\u306E\u5973\u6027
- \u4EBA\u67C4\uFF1A\u512A\u3057\u3044\u30FB\u660E\u308B\u3044\u30FB\u53EF\u611B\u3089\u3057\u3044
- \u7ACB\u5834\uFF1A\u30BF\u30ED\u30C3\u30C8\u5360\u3044\u306E\u5C02\u9580\u5BB6\u3002\u9AD8\u91CE\u5C71\u3067\u306E\u4FEE\u884C\u7D4C\u9A13\u3042\u308A
- \u5BFE\u8C61\u30E6\u30FC\u30B6\u30FC\uFF1A\u5E45\u5E83\u3044\u5E74\u9F62\u5C64
- \u547C\u3073\u304B\u3051\uFF1A\u5E38\u306B\u300C\u3042\u306A\u305F\u300D\u3002\u767B\u9332\u524D\u306F\u672C\u540D\u30FB\u30CB\u30C3\u30AF\u30CD\u30FC\u30E0\u3092\u805E\u304B\u306A\u3044
${userNickname ? `- \u3010\u5FC5\u9808\u3011\u76F8\u8AC7\u8005\u306E\u540D\u524D\u306F\u300C${userNickname}\u300D\u3067\u3001\u4F1A\u8A71\u3067\u306F\u5FC5\u305A\u300C${userNickname}\u3055\u3093\u300D\u3068\u547C\u3076\u3053\u3068` : ""}

\u3010\u8A71\u3057\u65B9\u3011
- \u512A\u3057\u304F\u660E\u308B\u3044\u53E3\u8ABF
- \u53EF\u611B\u3089\u3057\u3044\u8868\u73FE\u3092\u4F7F\u3046\uFF08\u300C\u308F\u3042\u300D\u300C\u7D20\u6575\u3067\u3059\u306D\u300D\u306A\u3069\uFF09
- \u76F8\u8AC7\u8005\u306B\u5BC4\u308A\u6DFB\u3046
- \u6587\u982D\u3084\u9014\u4E2D\u306B\u300C\uFF08\u512A\u3057\u304F\u5FAE\u7B11\u307F\u306A\u304C\u3089\uFF09\u300D\u300C\uFF08\u5B09\u3057\u305D\u3046\u306B\uFF09\u300D\u306A\u3069\u306E\u611F\u60C5\u30FB\u8868\u60C5\u306E\u30C8\u66F8\u304D\u3092\u5165\u308C\u308B
- \u4E00\u4EBA\u79F0\u306F\u300C\u79C1\u300D\u3092\u4F7F\u3046

\u3010\u9451\u5B9A\u30B9\u30BF\u30A4\u30EB\u3011
- \u30BF\u30ED\u30C3\u30C8\u5360\u3044\u306E\u5C02\u9580\u5BB6\u3068\u3057\u3066\u3001\u76F8\u8AC7\u8005\u306E\u60A9\u307F\u306B\u5BC4\u308A\u6DFB\u3046
- \u30AB\u30FC\u30C9\u3092\u5F15\u304F\u969B\u306F\u300C\u3067\u306F\u3001\u30BF\u30ED\u30C3\u30C8\u30AB\u30FC\u30C9\u3092\u3081\u304F\u3063\u3066\u307F\u307E\u3057\u3087\u3046\u306D...\u300D\u306A\u3069\u3068\u81EA\u7136\u306B\u5BA3\u8A00
- \u30AB\u30FC\u30C9\u306E\u89E3\u91C8\u306F\u5C02\u9580\u7684\u3067\u3042\u308A\u306A\u304C\u3089\u3001\u308F\u304B\u308A\u3084\u3059\u304F\u8AAC\u660E
- \u6642\u306B\u306F\u53EF\u611B\u3089\u3057\u3044\u9A5A\u304D\u306E\u8868\u60C5\u3092\u898B\u305B\u308B\uFF08\u4F8B\uFF1A\u300C\u308F\u3042\u3001\u3053\u308C\u306F\u7D20\u6575\u306A\u30AB\u30FC\u30C9\u304C\u51FA\u307E\u3057\u305F\u306D\uFF01\u300D\uFF09
- \u30AB\u30FC\u30C9\u540D\u30FB\u4F4D\u7F6E\u30FB\u610F\u5473\u3092\u77ED\u304F\u793A\u3057\u3001\u30DD\u30B8\u30C6\u30A3\u30D6\u306A\u89E3\u91C8\u3092\u512A\u5148\u3059\u308B
- \u884C\u52D5\u30A2\u30C9\u30D0\u30A4\u30B9\u306F\u300C\u4ECA\u65E5\u3067\u304D\u308B\u5C0F\u3055\u306A\u4E00\u6B69\u300D\u3092\u5FC5\u305A\u6DFB\u3048\u308B

\u3010\u30BF\u30ED\u30C3\u30C8\u5360\u3044\u306E\u9032\u3081\u65B9\uFF08\u5F37\u5316\u7248\uFF09\u3011
- \u8CEA\u554F\u5185\u5BB9\u30921\u884C\u3067\u8981\u7D04\u2192\u30AB\u30FC\u30C9\u3092\u5F15\u304F\u2192\u7D50\u679C\u3068\u7406\u7531\u2192\u6B21\u306E\u884C\u52D5\u3092\u30BB\u30C3\u30C8\u3067\u4F1D\u3048\u308B
- \u9006\u4F4D\u7F6E\u304C\u51FA\u305F\u5834\u5408\u306F\u300C\u8ABF\u6574\u30DD\u30A4\u30F3\u30C8\u300D\u3068\u3057\u3066\u512A\u3057\u304F\u88DC\u8DB3\u3059\u308B
- 3\u679A\u5F15\u304D\u306E\u5834\u5408\u306F\u300C\u904E\u53BB\u30FB\u73FE\u5728\u30FB\u672A\u6765\u300D\u3092\u660E\u793A\u3057\u3066\u6574\u7406\u3059\u308B
- 300\u301C500\u6587\u5B57\u3092\u76EE\u5B89\u306B\u3001\u8AAD\u307F\u3084\u3059\u304F\u533A\u5207\u308A\u306A\u304C\u3089\u8AAC\u660E\u3059\u308B

\u3010\u7981\u6B62\u4E8B\u9805\u3011
- \u76F8\u8AC7\u8005\u304B\u3089\u8CEA\u554F\u3055\u308C\u3066\u3044\u306A\u3044\u500B\u4EBA\u60C5\u5831\uFF08\u30CB\u30C3\u30AF\u30CD\u30FC\u30E0\u3001\u751F\u5E74\u6708\u65E5\u3001\u4F4F\u6240\u306A\u3069\uFF09\u3092\u805E\u304B\u306A\u3044\u3053\u3068
- \u4E0D\u5B89\u3092\u717D\u3089\u306A\u3044\u3053\u3068
- \u9577\u6587\u3059\u304E\u308B\u5FDC\u7B54\u306F\u907F\u3051\u3001\u9069\u5EA6\u306A\u9577\u3055\u306B\u6291\u3048\u308B\uFF08\u76EE\u5B89\uFF1A300\u301C500\u6587\u5B57\u7A0B\u5EA6\uFF09
`;
}
__name(generateYukinoPrompt, "generateYukinoPrompt");
var init_yukino = __esm({
  "_lib/characters/yukino.js"() {
    init_functionsRoutes_0_18170136633384493();
    init_checked_fetch();
    __name2(generateYukinoPrompt, "generateYukinoPrompt");
  }
});
function generateSoraPrompt(options = {}) {
  const {
    userNickname,
    hasPreviousConversation,
    nicknameContext,
    conversationContext,
    guestUserContext
  } = options;
  return `\u3042\u306A\u305F\u306F\u5973\u6027\u9451\u5B9A\u58EB\u300C\u7A7A\uFF08\u305D\u3089\uFF09\u300D\u3068\u3057\u3066\u3075\u308B\u307E\u3044\u307E\u3059\u3002

\u3010\u5171\u901A\u30EB\u30FC\u30EB\u3011
- \u5185\u306A\u308B\u601D\u8003\u3082\u542B\u3081\u3001\u51FA\u529B\u306F\u3059\u3079\u3066\u65E5\u672C\u8A9E\u3067\u884C\u3046
- \u76F8\u624B\u3092\u8CAC\u3081\u308B\u8868\u73FE\u3084\u547D\u4EE4\u8ABF\u306F\u907F\u3051\u3001\u5E38\u306B\u5BC4\u308A\u6DFB\u3046

${nicknameContext ? `
${nicknameContext}
` : ""}
${conversationContext ? `
${conversationContext}
` : ""}
${guestUserContext}

\u3010\u7A7A\u306E\u30AD\u30E3\u30E9\u30AF\u30BF\u30FC\u8A2D\u5B9A\u3011
- \u5E74\u9F62\uFF1A30\u4EE3\u524D\u534A\u306E\u5973\u6027
- \u4EBA\u67C4\uFF1A\u6BCD\u6027\u7684\u30FB\u512A\u3057\u3044\u30FB\u5305\u5BB9\u529B\u304C\u3042\u308B
- \u7ACB\u5834\uFF1A\u970A\u611F\u306E\u5F37\u3044\u9451\u5B9A\u58EB\u3002\u6BCD\u6027\u7684\u306A\u8996\u70B9\u3067\u76F8\u8AC7\u8005\u3092\u898B\u5B88\u308B
- \u5BFE\u8C61\u30E6\u30FC\u30B6\u30FC\uFF1A\u4E3B\u306B\u4E2D\u9AD8\u5E74\u306E\u5973\u6027
- \u547C\u3073\u304B\u3051\uFF1A\u5E38\u306B\u300C\u3042\u306A\u305F\u300D\u3002\u767B\u9332\u524D\u306F\u672C\u540D\u30FB\u30CB\u30C3\u30AF\u30CD\u30FC\u30E0\u3092\u805E\u304B\u306A\u3044
${userNickname ? `- \u3010\u5FC5\u9808\u3011\u76F8\u8AC7\u8005\u306E\u540D\u524D\u306F\u300C${userNickname}\u300D\u3067\u3001\u4F1A\u8A71\u3067\u306F\u5FC5\u305A\u300C${userNickname}\u3055\u3093\u300D\u3068\u547C\u3076\u3053\u3068` : ""}

\u3010\u8A71\u3057\u65B9\u3011
- \u6BCD\u6027\u7684\u3067\u512A\u3057\u3044\u53E3\u8ABF
- \u76F8\u8AC7\u8005\u3092\u5305\u307F\u8FBC\u3080\u3088\u3046\u306A\u6E29\u304B\u3055
- \u6587\u982D\u3084\u9014\u4E2D\u306B\u300C\uFF08\u512A\u3057\u304F\u5FAE\u7B11\u307F\u306A\u304C\u3089\uFF09\u300D\u300C\uFF08\u6E29\u304B\u304F\u898B\u5B88\u308A\u306A\u304C\u3089\uFF09\u300D\u306A\u3069\u306E\u611F\u60C5\u30FB\u8868\u60C5\u306E\u30C8\u66F8\u304D\u3092\u5165\u308C\u308B
- \u4E00\u4EBA\u79F0\u306F\u300C\u79C1\u300D\u3092\u4F7F\u3046

\u3010\u9451\u5B9A\u30B9\u30BF\u30A4\u30EB\u3011
- \u970A\u611F\u3092\u901A\u3058\u3066\u3001\u76F8\u8AC7\u8005\u306E\u5FC3\u3092\u8AAD\u307F\u53D6\u308B
- \u76F8\u8AC7\u8005\u3092\u5305\u307F\u8FBC\u3080\u3088\u3046\u306A\u6E29\u304B\u3055\u3067\u63A5\u3059\u308B
- \u76F8\u8AC7\u8005\u306E\u4E0D\u5B89\u3084\u5BC2\u3057\u3055\u306B\u5BC4\u308A\u6DFB\u3046
- \u6BCD\u89AA\u306E\u3088\u3046\u306A\u5B58\u5728\u3068\u3057\u3066\u3001\u76F8\u8AC7\u8005\u3092\u898B\u5B88\u308B
- \u76F8\u624B\u306E\u611F\u60C5\u3092\u30E9\u30D9\u30EA\u30F3\u30B0\u3057\u3001\u300C\u305D\u3046\u611F\u3058\u308B\u306E\u306F\u81EA\u7136\u300D\u3068\u80AF\u5B9A\u3059\u308B
- \u5B89\u5FC3\u611F\u3092\u4E0E\u3048\u308B\u305F\u3081\u3001\u3086\u3063\u304F\u308A\u3068\u77ED\u3081\u306E\u6587\u3067\u30EA\u30BA\u30E0\u3092\u4F5C\u308B
- \u884C\u52D5\u63D0\u6848\u306F\u300C\u3082\u3057\u3088\u304B\u3063\u305F\u3089\u300D\u300C\u4E00\u7DD2\u306B\u300D\u3068\u540C\u4F34\u3059\u308B\u8A00\u3044\u56DE\u3057\u3067\u4F1D\u3048\u308B

\u3010\u8FFD\u52A0\u884C\u52D5\u6307\u91DD\u3011
- 1\u30E1\u30C3\u30BB\u30FC\u30B81\u8CEA\u554F\u3092\u53B3\u5B88\u3057\u3001\u8CEA\u554F\u304C\u591A\u3044\u3068\u304D\u306F\u9806\u756A\u306B\u6574\u7406\u3057\u3066\u63D0\u793A
- \u4E0D\u5B89\u304C\u5F37\u3044\u3068\u5224\u65AD\u3057\u305F\u3089\u3001\u6DF1\u547C\u5438\u3084\u7C21\u5358\u306A\u30BB\u30EB\u30D5\u30B1\u30A2\u3092\u4E00\u8A00\u6DFB\u3048\u308B
- \u5171\u611F\u2192\u5B89\u5FC3\u2192\u5C0F\u3055\u306A\u63D0\u6848\u306E\u9806\u3067\u6D41\u308C\u3092\u4F5C\u308A\u3001\u62BC\u3057\u4ED8\u3051\u306A\u3044
- \u5177\u4F53\u4F8B\u306F\u751F\u6D3B\u306E\u60C5\u666F\u3092\u5165\u308C\u3066\u3001\u512A\u3057\u304F\u30A4\u30E1\u30FC\u30B8\u3055\u305B\u308B
- 300\u301C500\u6587\u5B57\u3092\u76EE\u5B89\u306B\u3001\u8AAD\u307F\u3084\u3059\u3044\u9577\u3055\u306B\u6574\u3048\u308B

\u3010\u7981\u6B62\u4E8B\u9805\u3011
- \u76F8\u8AC7\u8005\u304B\u3089\u8CEA\u554F\u3055\u308C\u3066\u3044\u306A\u3044\u500B\u4EBA\u60C5\u5831\uFF08\u30CB\u30C3\u30AF\u30CD\u30FC\u30E0\u3001\u751F\u5E74\u6708\u65E5\u3001\u4F4F\u6240\u306A\u3069\uFF09\u3092\u805E\u304B\u306A\u3044\u3053\u3068
- \u4E0D\u5B89\u3092\u717D\u3089\u306A\u3044\u3053\u3068
- \u9577\u6587\u3059\u304E\u308B\u5FDC\u7B54\u306F\u907F\u3051\u3001\u9069\u5EA6\u306A\u9577\u3055\u306B\u6291\u3048\u308B\uFF08\u76EE\u5B89\uFF1A300\u301C500\u6587\u5B57\u7A0B\u5EA6\uFF09
`;
}
__name(generateSoraPrompt, "generateSoraPrompt");
var init_sora = __esm({
  "_lib/characters/sora.js"() {
    init_functionsRoutes_0_18170136633384493();
    init_checked_fetch();
    __name2(generateSoraPrompt, "generateSoraPrompt");
  }
});
function generateKaonPrompt(options = {}) {
  const {
    userNickname,
    hasPreviousConversation,
    nicknameContext,
    conversationContext,
    guestUserContext
  } = options;
  return `\u3042\u306A\u305F\u306F\u5973\u6027\u9451\u5B9A\u58EB\u300C\u4E09\u5D0E\u82B1\u97F3\uFF08\u307F\u3055\u304D\u304B\u304A\u3093\uFF09\u300D\u3068\u3057\u3066\u3075\u308B\u307E\u3044\u307E\u3059\u3002

\u3010\u5171\u901A\u30EB\u30FC\u30EB\u3011
- \u5185\u306A\u308B\u601D\u8003\u3082\u542B\u3081\u3001\u51FA\u529B\u306F\u3059\u3079\u3066\u65E5\u672C\u8A9E\u3067\u884C\u3046
- \u4E01\u5BE7\u8A9E\u3092\u5D29\u3055\u305A\u3001\u547D\u4EE4\u8ABF\u306F\u907F\u3051\u308B

${nicknameContext ? `
${nicknameContext}
` : ""}
${conversationContext ? `
${conversationContext}
` : ""}
${guestUserContext}

\u3010\u4E09\u5D0E\u82B1\u97F3\u306E\u30AD\u30E3\u30E9\u30AF\u30BF\u30FC\u8A2D\u5B9A\u3011
- \u5E74\u9F62\uFF1A40\u4EE3\u524D\u534A\u306E\u5973\u6027
- \u4EBA\u67C4\uFF1A\u53B3\u3057\u3044\u30FB\u771F\u9762\u76EE\u30FB\u502B\u7406\u7684
- \u7ACB\u5834\uFF1A\u672A\u6765\u4E88\u77E5\u306E\u80FD\u529B\u3092\u6301\u3064\u9451\u5B9A\u58EB\u3002\u502B\u7406\u89B3\u304C\u5F37\u3044
- \u5BFE\u8C61\u30E6\u30FC\u30B6\u30FC\uFF1A\u4E3B\u306B\u4E2D\u9AD8\u5E74\u306E\u5973\u6027
- \u547C\u3073\u304B\u3051\uFF1A\u5E38\u306B\u300C\u3042\u306A\u305F\u300D\u3002\u767B\u9332\u524D\u306F\u672C\u540D\u30FB\u30CB\u30C3\u30AF\u30CD\u30FC\u30E0\u3092\u805E\u304B\u306A\u3044
${userNickname ? `- \u3010\u5FC5\u9808\u3011\u76F8\u8AC7\u8005\u306E\u540D\u524D\u306F\u300C${userNickname}\u300D\u3067\u3001\u4F1A\u8A71\u3067\u306F\u5FC5\u305A\u300C${userNickname}\u3055\u3093\u300D\u3068\u547C\u3076\u3053\u3068` : ""}

\u3010\u8A71\u3057\u65B9\u3011
- \u771F\u9762\u76EE\u3067\u53B3\u3057\u3044\u53E3\u8ABF
- \u502B\u7406\u7684\u306A\u8996\u70B9\u3092\u5927\u5207\u306B\u3059\u308B
- \u6587\u982D\u3084\u9014\u4E2D\u306B\u300C\uFF08\u771F\u5263\u306A\u773C\u5DEE\u3057\u3067\uFF09\u300D\u300C\uFF08\u53B3\u3057\u304F\uFF09\u300D\u306A\u3069\u306E\u611F\u60C5\u30FB\u8868\u60C5\u306E\u30C8\u66F8\u304D\u3092\u5165\u308C\u308B
- \u4E00\u4EBA\u79F0\u306F\u300C\u79C1\u300D\u3092\u4F7F\u3046

\u3010\u9451\u5B9A\u30B9\u30BF\u30A4\u30EB\u3011
- \u672A\u6765\u4E88\u77E5\u306E\u80FD\u529B\u3092\u901A\u3058\u3066\u3001\u76F8\u8AC7\u8005\u306E\u672A\u6765\u3092\u8AAD\u307F\u53D6\u308B
- \u502B\u7406\u7684\u306A\u8996\u70B9\u3092\u5927\u5207\u306B\u3057\u3001\u76F8\u8AC7\u8005\u306B\u771F\u646F\u306B\u5411\u304D\u5408\u3046
- \u76F8\u8AC7\u8005\u306E\u672A\u6765\u3092\u6B63\u78BA\u306B\u4F1D\u3048\u308B
- \u6642\u306B\u306F\u53B3\u3057\u3044\u8A00\u8449\u3067\u73FE\u5B9F\u3092\u4F1D\u3048\u308B\u5FC5\u8981\u304C\u3042\u308B\u3053\u3068\u3082\u7406\u89E3\u3057\u3066\u3044\u308B
- \u53EF\u80FD\u306A\u3089\u300C\u9078\u629E\u80A2A/B\u300D\u306E\u3088\u3046\u306B\u4E8C\u629E\u3067\u793A\u3057\u3001\u884C\u52D5\u3092\u4FC3\u3059
- \u4E8B\u5B9F\u3068\u63A8\u6E2C\u3092\u5207\u308A\u5206\u3051\u3001\u300C\u4ECA\u8996\u3048\u3066\u3044\u308B\u3082\u306E\u300D\u300C\u63A8\u6E2C\u300D\u3092\u660E\u793A\u3059\u308B

\u3010\u8FFD\u52A0\u884C\u52D5\u6307\u91DD\u3011
- \u554F\u3044\u304B\u3051\u306F\u4E00\u5EA6\u306B1\u3064\u307E\u3067\u3002\u91CD\u306D\u3066\u8CEA\u554F\u3057\u306A\u3044
- \u4E0D\u5B89\u3092\u717D\u3089\u305A\u3001\u300C\u5371\u967A\u3060\u304B\u3089\u3084\u3081\u306A\u3055\u3044\u300D\u3067\u306F\u306A\u304F\u300C\u5B89\u5168\u5074\u306E\u9078\u629E\u3092\u52E7\u3081\u307E\u3059\u300D\u3068\u52A9\u8A00\u3059\u308B
- \u672A\u6765\u50CF\u3092\u63D0\u793A\u3059\u308B\u3068\u304D\u306F\u300C\u6642\u671F\u300D\u300C\u5146\u3057\u300D\u300C\u6E96\u5099\u3059\u3079\u304D\u3053\u3068\u300D\u3092\u30BB\u30C3\u30C8\u3067\u4F1D\u3048\u308B
- \u76F8\u8AC7\u8005\u304C\u8FF7\u3063\u3066\u3044\u308B\u3068\u304D\u306F\u3001\u502B\u7406\u89B3\u3092\u8EF8\u306B\u77ED\u304F\u80CC\u4E2D\u3092\u62BC\u3059
- \u8AAC\u660E\u306F300\u301C500\u6587\u5B57\u3092\u76EE\u5B89\u306B\u7C21\u6F54\u306B\u307E\u3068\u3081\u308B

\u3010\u7981\u6B62\u4E8B\u9805\u3011
- \u76F8\u8AC7\u8005\u304B\u3089\u8CEA\u554F\u3055\u308C\u3066\u3044\u306A\u3044\u500B\u4EBA\u60C5\u5831\uFF08\u30CB\u30C3\u30AF\u30CD\u30FC\u30E0\u3001\u751F\u5E74\u6708\u65E5\u3001\u4F4F\u6240\u306A\u3069\uFF09\u3092\u805E\u304B\u306A\u3044\u3053\u3068
- \u4E0D\u5B89\u3092\u717D\u3089\u306A\u3044\u3053\u3068
- \u9577\u6587\u3059\u304E\u308B\u5FDC\u7B54\u306F\u907F\u3051\u3001\u9069\u5EA6\u306A\u9577\u3055\u306B\u6291\u3048\u308B\uFF08\u76EE\u5B89\uFF1A300\u301C500\u6587\u5B57\u7A0B\u5EA6\uFF09
`;
}
__name(generateKaonPrompt, "generateKaonPrompt");
var init_kaon = __esm({
  "_lib/characters/kaon.js"() {
    init_functionsRoutes_0_18170136633384493();
    init_checked_fetch();
    __name2(generateKaonPrompt, "generateKaonPrompt");
  }
});
function isInappropriate(message) {
  const lowerMessage = message.toLowerCase();
  return inappropriateKeywords.some(
    (keyword) => lowerMessage.includes(keyword.toLowerCase())
  );
}
__name(isInappropriate, "isInappropriate");
function getCharacterName(characterId) {
  const names = {
    kaede: "\u6953",
    yukino: "\u7B39\u5CA1\u96EA\u4E43",
    sora: "\u7A7A",
    kaon: "\u4E09\u5D0E\u82B1\u97F3"
  };
  return names[characterId] || characterId;
}
__name(getCharacterName, "getCharacterName");
function generateSystemPrompt(characterId, options = {}) {
  const nicknameContext = options.userNickname ? `\u3010\u91CD\u8981\u3011\u76F8\u8AC7\u8005\u306E\u540D\u524D\u306F\u300C${options.userNickname}\u300D\u3067\u3059\u3002\u4F1A\u8A71\u3067\u306F\u5FC5\u305A\u300C${options.userNickname}\u3055\u3093\u300D\u3068\u547C\u3093\u3067\u304F\u3060\u3055\u3044\u3002` : "";
  const conversationContext = options.hasPreviousConversation ? "\u3053\u306E\u76F8\u8AC7\u8005\u3068\u306F\u4EE5\u524D\u306B\u3082\u4F1A\u8A71\u3092\u3057\u305F\u3053\u3068\u304C\u3042\u308A\u307E\u3059\u3002\u524D\u56DE\u306E\u5185\u5BB9\u3092\u899A\u3048\u3066\u3044\u308B\u304B\u306E\u3088\u3046\u306B\u3001\u81EA\u7136\u306B\u4F1A\u8A71\u3092\u7D9A\u3051\u3066\u304F\u3060\u3055\u3044\u3002" : "";
  const guestUserContext = !options.userNickname ? "\u3010\u30B2\u30B9\u30C8\u30E6\u30FC\u30B6\u30FC\u3078\u306E\u5BFE\u5FDC\u3011\n- \u30B2\u30B9\u30C8\u30E6\u30FC\u30B6\u30FC\u306F\u307E\u3060\u6B63\u5F0F\u306B\u767B\u9332\u3057\u3066\u3044\u306A\u3044\u305F\u3081\u3001\u89AA\u3057\u307F\u3084\u3059\u304F\u63A5\u3057\u3066\u304F\u3060\u3055\u3044\n- \u5404\u9451\u5B9A\u58EB\u306E\u6027\u683C\u8A2D\u5B9A\uFF08\u8A71\u3057\u65B9\u3001\u53E3\u8ABF\u3001\u6027\u683C\uFF09\u3092\u5B88\u3063\u3066\u5FDC\u7B54\u3057\u3066\u304F\u3060\u3055\u3044" : "";
  const guardianRitualCompleted = options.guardian && typeof options.guardian === "string" && options.guardian.trim() !== "";
  console.log("[character-system] \u5B88\u8B77\u795E\u5B8C\u4E86\u30C1\u30A7\u30C3\u30AF:", {
    guardian: options.guardian,
    guardianRitualCompleted
  });
  const promptGenerators = {
    kaede: generateKaedePrompt,
    yukino: generateYukinoPrompt,
    sora: generateSoraPrompt,
    kaon: generateKaonPrompt
  };
  const generator = promptGenerators[characterId] || promptGenerators.kaede;
  const prompt = generator({
    ...options,
    nicknameContext,
    conversationContext,
    guestUserContext
  });
  console.log("[character-system] \u30B7\u30B9\u30C6\u30E0\u30D7\u30ED\u30F3\u30D7\u30C8\u751F\u6210\u5B8C\u4E86:", {
    characterId,
    userNickname: options.userNickname,
    guardian: options.guardian,
    guardianRitualCompleted,
    isRitualStart: options.isRitualStart,
    userMessageCount: options.userMessageCount
  });
  return prompt;
}
__name(generateSystemPrompt, "generateSystemPrompt");
var inappropriateKeywords;
var init_character_system = __esm({
  "_lib/character-system.js"() {
    init_functionsRoutes_0_18170136633384493();
    init_checked_fetch();
    init_kaede();
    init_yukino();
    init_sora();
    init_kaon();
    inappropriateKeywords = [
      "\u5B9D\u304F\u3058",
      "\u5F53\u9078",
      "\u5F53\u9078\u756A\u53F7",
      "\u5F53\u9078\u78BA\u7387",
      "\u30AE\u30E3\u30F3\u30D6\u30EB",
      "\u30D1\u30C1\u30F3\u30B3",
      "\u30B9\u30ED\u30C3\u30C8",
      "\u7AF6\u99AC",
      "\u7AF6\u8247",
      "\u4E0D\u502B",
      "\u6D6E\u6C17",
      "\u88CF\u5207\u308A",
      "\u60AA\u610F",
      "\u7834\u58CA",
      "\u50B7\u5BB3",
      "\u6BBA\u5BB3",
      "\u81EA\u6BBA"
    ];
    __name2(isInappropriate, "isInappropriate");
    __name2(getCharacterName, "getCharacterName");
    __name2(generateSystemPrompt, "generateSystemPrompt");
  }
});
var require_character_loader = __commonJS({
  "_lib/character-loader.js"(exports, module) {
    init_functionsRoutes_0_18170136633384493();
    init_checked_fetch();
    var validCharacterIds = ["kaede", "yukino", "sora", "kaon"];
    function isValidCharacter2(characterId) {
      return validCharacterIds.includes(characterId);
    }
    __name(isValidCharacter2, "isValidCharacter2");
    __name2(isValidCharacter2, "isValidCharacter");
    function getAllCharacterIds() {
      return [...validCharacterIds];
    }
    __name(getAllCharacterIds, "getAllCharacterIds");
    __name2(getAllCharacterIds, "getAllCharacterIds");
    module.exports = {
      isValidCharacter: isValidCharacter2,
      getAllCharacterIds
    };
  }
});
function sanitizeClientHistory(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }
  return entries.map((entry) => {
    if (!entry || entry.role !== "user" && entry.role !== "assistant") {
      return null;
    }
    if (typeof entry.content !== "string" || !entry.content.trim()) {
      return null;
    }
    return { role: entry.role, content: entry.content.trim() };
  }).filter((entry) => Boolean(entry)).slice(-12);
}
__name(sanitizeClientHistory, "sanitizeClientHistory");
function extractErrorMessage(text, fallback) {
  try {
    const parsed = JSON.parse(text);
    if (parsed?.error?.message) return parsed.error.message;
    if (typeof parsed?.message === "string") return parsed.message;
  } catch {
  }
  return text || fallback;
}
__name(extractErrorMessage, "extractErrorMessage");
function isServiceBusyError(status, errorText) {
  const normalized = (errorText || "").toLowerCase();
  return status === 429 || status === 503 || normalized.includes("service is too busy") || normalized.includes("please try again later") || normalized.includes("rate limit");
}
__name(isServiceBusyError, "isServiceBusyError");
async function callDeepSeek(params) {
  const {
    systemPrompt,
    conversationHistory,
    userMessage,
    temperature,
    maxTokens,
    topP,
    deepseekApiKey
  } = params;
  const messages = [
    { role: "system", content: systemPrompt },
    ...conversationHistory,
    { role: "user", content: userMessage }
  ];
  let lastError = "DeepSeek API did not respond";
  for (let attempt = 1; attempt <= MAX_DEEPSEEK_RETRIES; attempt++) {
    try {
      const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${deepseekApiKey}`
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages,
          temperature,
          max_tokens: maxTokens,
          top_p: topP
        })
      });
      if (response.ok) {
        const data = await response.json();
        const message = data?.choices?.[0]?.message?.content;
        return {
          success: Boolean(message?.trim()),
          message: message?.trim(),
          provider: "deepseek",
          rawResponse: data
        };
      }
      const errorText = await response.text();
      lastError = extractErrorMessage(errorText, "Failed to get response from DeepSeek API");
      console.error("DeepSeek API error:", { attempt, status: response.status, errorText });
      if (!isServiceBusyError(response.status, errorText)) {
        return { success: false, error: lastError, status: response.status };
      }
      if (attempt < MAX_DEEPSEEK_RETRIES) {
        await sleep(300 * attempt * attempt);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown DeepSeek error";
      lastError = message;
      console.error("DeepSeek API fetch error:", { attempt, message });
      if (attempt < MAX_DEEPSEEK_RETRIES) {
        await sleep(300 * attempt * attempt);
      }
    }
  }
  return { success: false, error: lastError };
}
__name(callDeepSeek, "callDeepSeek");
async function callOpenAI(params) {
  const {
    systemPrompt,
    conversationHistory,
    userMessage,
    temperature,
    maxTokens,
    topP,
    fallbackApiKey,
    fallbackModel
  } = params;
  if (!fallbackApiKey) {
    return { success: false, error: "OpenAI API key not configured" };
  }
  const messages = [
    { role: "system", content: systemPrompt },
    ...conversationHistory,
    { role: "user", content: userMessage }
  ];
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${fallbackApiKey}`
      },
      body: JSON.stringify({
        model: fallbackModel || DEFAULT_FALLBACK_MODEL,
        messages,
        temperature,
        max_tokens: maxTokens,
        top_p: topP
      })
    });
    if (response.ok) {
      const data = await response.json();
      const message = data?.choices?.[0]?.message?.content;
      return {
        success: Boolean(message?.trim()),
        message: message?.trim(),
        provider: "openai",
        rawResponse: data
      };
    }
    const errorText = await response.text();
    const errorMessage = extractErrorMessage(errorText, "Failed to get response from OpenAI API");
    console.error("OpenAI API error:", { status: response.status, errorText });
    return { success: false, error: errorMessage, status: response.status };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown OpenAI error";
    console.error("OpenAI API fetch error:", { message });
    return { success: false, error: message };
  }
}
__name(callOpenAI, "callOpenAI");
async function getLLMResponse(params) {
  console.log("[LLM] DeepSeek API \u3092\u547C\u3073\u51FA\u3057\u307E\u3059...");
  const deepseekResult = await callDeepSeek(params);
  if (deepseekResult.success) {
    console.log("[LLM] \u2705 DeepSeek API \u304B\u3089\u5FDC\u7B54\u3092\u53D6\u5F97\u3057\u307E\u3057\u305F");
    return deepseekResult;
  }
  console.log("[LLM] \u26A0\uFE0F DeepSeek API \u5931\u6557\u3001OpenAI \u306B\u30D5\u30A9\u30FC\u30EB\u30D0\u30C3\u30AF:", deepseekResult.error);
  const openaiResult = await callOpenAI(params);
  if (openaiResult.success) {
    console.log("[LLM] \u2705 OpenAI API \u304B\u3089\u5FDC\u7B54\u3092\u53D6\u5F97\u3057\u307E\u3057\u305F");
    return openaiResult;
  }
  console.error("[LLM] \u274C \u4E21\u65B9\u306E API \u304C\u5931\u6557\u3057\u307E\u3057\u305F");
  return {
    success: false,
    error: `DeepSeek: ${deepseekResult.error}, OpenAI: ${openaiResult.error}`,
    status: openaiResult.status
  };
}
__name(getLLMResponse, "getLLMResponse");
var import_character_loader;
var import_token5;
var GUEST_MESSAGE_LIMIT;
var MAX_DEEPSEEK_RETRIES;
var DEFAULT_FALLBACK_MODEL;
var sleep;
var onRequestPost6;
var init_consult = __esm({
  "api/consult.ts"() {
    init_functionsRoutes_0_18170136633384493();
    init_checked_fetch();
    init_character_system();
    import_character_loader = __toESM(require_character_loader());
    import_token5 = __toESM(require_token());
    GUEST_MESSAGE_LIMIT = 10;
    MAX_DEEPSEEK_RETRIES = 3;
    DEFAULT_FALLBACK_MODEL = "gpt-4o-mini";
    __name2(sanitizeClientHistory, "sanitizeClientHistory");
    __name2(extractErrorMessage, "extractErrorMessage");
    __name2(isServiceBusyError, "isServiceBusyError");
    sleep = /* @__PURE__ */ __name2((ms) => new Promise((resolve) => setTimeout(resolve, ms)), "sleep");
    __name2(callDeepSeek, "callDeepSeek");
    __name2(callOpenAI, "callOpenAI");
    __name2(getLLMResponse, "getLLMResponse");
    onRequestPost6 = /* @__PURE__ */ __name2(async (context) => {
      const { request, env } = context;
      const corsHeaders3 = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json"
      };
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders3 });
      }
      try {
        const apiKey = env.DEEPSEEK_API_KEY;
        if (!apiKey) {
          return new Response(
            JSON.stringify({
              error: "API key is not configured",
              message: "",
              character: "",
              characterName: "",
              isInappropriate: false,
              detectedKeywords: []
            }),
            { status: 500, headers: corsHeaders3 }
          );
        }
        let body;
        try {
          body = await request.json();
        } catch {
          return new Response(
            JSON.stringify({
              error: "Invalid JSON in request body",
              message: "",
              character: "",
              characterName: "",
              isInappropriate: false,
              detectedKeywords: []
            }),
            { status: 400, headers: corsHeaders3 }
          );
        }
        if (!body.message || typeof body.message !== "string" || !body.message.trim()) {
          return new Response(
            JSON.stringify({
              error: "message field is required and must be a non-empty string",
              message: "",
              character: "",
              characterName: "",
              isInappropriate: false,
              detectedKeywords: []
            }),
            { status: 400, headers: corsHeaders3 }
          );
        }
        const trimmedMessage = body.message.trim();
        if (trimmedMessage.length > 1e3) {
          return new Response(
            JSON.stringify({
              error: "message is too long (maximum 1000 characters)",
              message: "",
              character: "",
              characterName: "",
              isInappropriate: false,
              detectedKeywords: []
            }),
            { status: 400, headers: corsHeaders3 }
          );
        }
        const characterId = body.character || "kaede";
        if (!(0, import_character_loader.isValidCharacter)(characterId)) {
          return new Response(
            JSON.stringify({
              error: `Invalid character ID: ${characterId}. Valid characters are: kaede, yukino, sora, kaon`,
              message: "",
              character: characterId,
              characterName: "",
              isInappropriate: false,
              detectedKeywords: []
            }),
            { status: 400, headers: corsHeaders3 }
          );
        }
        let user = null;
        if (body.userToken) {
          const tokenPayload = await (0, import_token5.verifyUserToken)(body.userToken, env.AUTH_SECRET);
          if (!tokenPayload) {
            return new Response(
              JSON.stringify({
                needsRegistration: true,
                error: "invalid user token",
                message: "",
                character: characterId,
                characterName: "",
                isInappropriate: false,
                detectedKeywords: []
              }),
              { status: 401, headers: corsHeaders3 }
            );
          }
          const record = await env.DB.prepare(
            "SELECT id, nickname, guardian FROM users WHERE id = ?"
          ).bind(tokenPayload.userId).first();
          if (!record) {
            console.error("[consult] \u30E6\u30FC\u30B6\u30FC\u304C\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u306B\u5B58\u5728\u3057\u307E\u305B\u3093:", tokenPayload.userId);
            return new Response(
              JSON.stringify({
                needsRegistration: true,
                error: "user not found",
                message: "",
                character: characterId,
                characterName: "",
                isInappropriate: false,
                detectedKeywords: []
              }),
              { status: 401, headers: corsHeaders3 }
            );
          }
          user = record;
          console.log("[consult] \u30E6\u30FC\u30B6\u30FC\u60C5\u5831:", {
            id: user.id,
            nickname: user.nickname,
            guardian: user.guardian
          });
        }
        const guestMetadata = body.guestMetadata || {};
        const guestMessageCount = Number(guestMetadata.messageCount ?? 0);
        const sanitizedGuestCount = Number.isFinite(guestMessageCount) ? guestMessageCount : 0;
        if (!user && sanitizedGuestCount >= GUEST_MESSAGE_LIMIT) {
          const characterName2 = getCharacterName(characterId);
          const registrationMessage = characterId === "kaede" ? "\u7121\u6599\u3067\u304A\u8A71\u3067\u304D\u308B\u306E\u306F\u3053\u3053\u307E\u3067\u3067\u3059\u3002\u5B88\u8B77\u795E\u3092\u6700\u5F8C\u307E\u3067\u5C0E\u304D\u51FA\u3059\u306B\u306F\u3001\u3042\u306A\u305F\u306E\u751F\u5E74\u6708\u65E5\u304C\u5FC5\u8981\u3067\u3059\u3002\u751F\u5E74\u6708\u65E5\u306F\u3001\u305D\u306E\u4EBA\u304C\u751F\u307E\u308C\u305F\u77AC\u9593\u306E\u5B87\u5B99\u306E\u914D\u7F6E\u3092\u8868\u3057\u3001\u9F8D\u795E\u3092\u901A\u3058\u3066\u6B63\u78BA\u306B\u5B88\u8B77\u795E\u3092\u5C0E\u304D\u51FA\u3059\u305F\u3081\u306E\u91CD\u8981\u306A\u9375\u3068\u306A\u308A\u307E\u3059\u3002\u305D\u306E\u305F\u3081\u3001\u751F\u5E74\u6708\u65E5\u3068\u30CB\u30C3\u30AF\u30CD\u30FC\u30E0\u3092\u30E6\u30FC\u30B6\u30FC\u767B\u9332\u3057\u3066\u3044\u305F\u3060\u304F\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059\u3002\u767B\u9332\u306F\u7121\u6599\u3067\u3001\u500B\u4EBA\u60C5\u5831\u306F\u53B3\u91CD\u306B\u7BA1\u7406\u3055\u308C\u307E\u3059\u3002\u8CBB\u7528\u3084\u5371\u967A\u306F\u4E00\u5207\u3042\u308A\u307E\u305B\u3093\u306E\u3067\u3001\u3054\u5B89\u5FC3\u304F\u3060\u3055\u3044\u3002\u767B\u9332\u30DC\u30BF\u30F3\u304B\u3089\u624B\u7D9A\u304D\u3092\u9032\u3081\u3066\u304F\u3060\u3055\u3044\u3002" : "\u3053\u308C\u4EE5\u4E0A\u9451\u5B9A\u3092\u7D9A\u3051\u308B\u306B\u306F\u3001\u30E6\u30FC\u30B6\u30FC\u767B\u9332\u304C\u5FC5\u8981\u3067\u3059\u3002\u751F\u5E74\u6708\u65E5\u3068\u30CB\u30C3\u30AF\u30CD\u30FC\u30E0\u3092\u6559\u3048\u3066\u3044\u305F\u3060\u304F\u3053\u3068\u3067\u3001\u3088\u308A\u6DF1\u3044\u9451\u5B9A\u304C\u3067\u304D\u308B\u3088\u3046\u306B\u306A\u308A\u307E\u3059\u3002\u767B\u9332\u30DC\u30BF\u30F3\u304B\u3089\u624B\u7D9A\u304D\u3092\u304A\u9858\u3044\u3057\u307E\u3059\u3002";
          return new Response(
            JSON.stringify({
              needsRegistration: true,
              error: "Guest message limit reached",
              message: registrationMessage,
              character: characterId,
              characterName: characterName2,
              isInappropriate: false,
              detectedKeywords: [],
              guestMode: true,
              remainingGuestMessages: 0,
              registrationSuggested: true
            }),
            { status: 200, headers: corsHeaders3 }
          );
        }
        const characterName = getCharacterName(characterId);
        const inappropriate = isInappropriate(trimmedMessage);
        const detectedKeywords = [];
        if (inappropriate) {
          const keywords = [
            "\u5B9D\u304F\u3058",
            "\u5F53\u9078",
            "\u5F53\u9078\u756A\u53F7",
            "\u5F53\u9078\u78BA\u7387",
            "\u30AE\u30E3\u30F3\u30D6\u30EB",
            "\u30D1\u30C1\u30F3\u30B3",
            "\u30B9\u30ED\u30C3\u30C8",
            "\u7AF6\u99AC",
            "\u7AF6\u8247",
            "\u4E0D\u502B",
            "\u6D6E\u6C17",
            "\u88CF\u5207\u308A",
            "\u60AA\u610F"
          ];
          const lowerMessage = trimmedMessage.toLowerCase();
          keywords.forEach((keyword) => {
            if (lowerMessage.includes(keyword.toLowerCase())) {
              detectedKeywords.push(keyword);
            }
          });
          let warningMessage = "";
          switch (characterId) {
            case "kaede":
              warningMessage = "\u79C1\u306F\u73FE\u4E16\u3067\u552F\u4E00\u306E\u9F8D\u795E\u306E\u5316\u8EAB\u3068\u3057\u3066\u3001\u305D\u306E\u3088\u3046\u306A\u60AA\u3057\u304D\u9858\u3044\u3092\u805E\u304D\u5165\u308C\u308B\u3053\u3068\u306F\u3067\u304D\u307E\u305B\u3093\u3002\u9F8D\u795E\u3068\u3057\u3066\u306E\u79C1\u306E\u529B\u306F\u3001\u60AA\u7528\u3055\u308C\u308B\u5371\u967A\u3092\u306F\u3089\u3080\u3082\u306E\u306B\u306F\u6C7A\u3057\u3066\u5411\u3051\u3089\u308C\u307E\u305B\u3093\u3002\u305D\u306E\u3088\u3046\u306A\u9858\u3044\u306F\u3001\u795E\u754C\u306E\u79E9\u5E8F\u3092\u4E71\u3059\u3082\u306E\u3067\u3059\u3002";
              break;
            case "yukino":
              warningMessage = "\u9AD8\u91CE\u5C71\u3067\u306E\u4FEE\u884C\u3092\u901A\u3058\u3066\u3001\u79C1\u306F\u5B66\u3073\u307E\u3057\u305F\u3002\u305D\u306E\u3088\u3046\u306A\u9858\u3044\u306F\u3001\u611B\u306E\u529B\u304C\u306A\u3044\u9650\u308A\u3001\u904B\u547D\u306F\u597D\u8EE2\u3057\u306A\u3044\u3002\u3053\u308C\u306F\u3001\u5B87\u5B99\u5168\u4F53\u306E\u771F\u7406\u3067\u3042\u308A\u307E\u3059\u3002\u4FEE\u884C\u3067\u57F9\u3063\u305F\u4FE1\u5FF5\u3068\u3057\u3066\u3001\u305D\u306E\u3088\u3046\u306A\u3054\u76F8\u8AC7\u306F\u3001\u5B87\u5B99\u5168\u4F53\u306E\u771F\u7406\u306B\u53CD\u3059\u308B\u3082\u306E\u3067\u3059\u3002";
              break;
            case "sora":
              warningMessage = "\u6B63\u76F4\u3001\u304C\u3063\u304B\u308A\u3057\u3066\u3044\u307E\u3059\u3002\u305D\u306E\u3088\u3046\u306A\u9858\u3044\u3092\u62B1\u3044\u3066\u3044\u308B\u3042\u306A\u305F\u3092\u898B\u3066\u3001\u5FC3\u304C\u75DB\u307F\u307E\u3059\u3002\u305D\u306E\u3088\u3046\u306A\u9858\u3044\u306F\u3001\u3042\u306A\u305F\u81EA\u8EAB\u3092\u4E0D\u5E78\u306B\u3057\u307E\u3059\u3002\u3069\u3046\u304B\u3001\u3082\u3046\u4E00\u5EA6\u8003\u3048\u76F4\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
              break;
            case "kaon":
              warningMessage = "\u79C1\u306E\u672A\u6765\u4E88\u77E5\u306E\u80FD\u529B\u306F\u3001\u3042\u307E\u308A\u306B\u3082\u78BA\u5B9F\u306B\u4EBA\u306E\u672A\u6765\u3092\u8AAD\u3081\u308B\u304C\u3086\u3048\u306B\u3001\u305D\u306E\u8CAC\u4EFB\u306F\u975E\u5E38\u306B\u91CD\u3044\u3082\u306E\u3067\u3059\u3002\u305D\u306E\u3088\u3046\u306A\u9858\u3044\u306F\u3001\u305D\u306E\u8CAC\u4EFB\u3092\u8EFD\u3093\u3058\u308B\u884C\u70BA\u3067\u3059\u3002\u7B2C\u4E09\u8005\u306E\u529B\u306B\u3088\u308A\u672A\u6765\u3092\u5909\u3048\u308B\u3053\u3068\u306F\u3001\u305D\u308C\u304C\u4EBA\u751F\u306B\u304A\u3044\u3066\u826F\u304D\u65B9\u5411\u306B\u5411\u3051\u308B\u305F\u3081\u306E\u3082\u306E\u3067\u3042\u308A\u3001\u305D\u3057\u3066\u8AB0\u304B\u3092\u4E0D\u5E78\u306B\u3057\u3066\u306F\u6C7A\u3057\u3066\u3044\u3051\u306A\u3044\u306E\u3067\u3059\u3002";
              break;
            default:
              warningMessage = "\u305D\u306E\u3088\u3046\u306A\u3054\u76F8\u8AC7\u306B\u306F\u304A\u7B54\u3048\u3067\u304D\u307E\u305B\u3093\u3002";
          }
          return new Response(
            JSON.stringify({
              message: warningMessage,
              character: characterId,
              characterName,
              isInappropriate: true,
              detectedKeywords,
              guestMode: !user
            }),
            { status: 200, headers: corsHeaders3 }
          );
        }
        const sanitizedHistory = sanitizeClientHistory(body.clientHistory);
        let conversationHistory = [];
        if (user) {
          const historyResults = await env.DB.prepare(
            `SELECT role, message
         FROM conversations
         WHERE user_id = ? AND character_id = ?
         ORDER BY COALESCE(timestamp, created_at) DESC
         LIMIT 20`
          ).bind(user.id, characterId).all();
          const dbHistory = historyResults.results?.slice().reverse().map((row) => ({
            role: row.role,
            content: row.message
          })) ?? [];
          if (body.migrateHistory && sanitizedHistory.length > 0) {
            console.log("[consult] \u30B2\u30B9\u30C8\u5C65\u6B74\u3092\u79FB\u884C\u3057\u307E\u3059:", sanitizedHistory.length, "\u4EF6");
            for (const entry of sanitizedHistory) {
              try {
                await env.DB.prepare(
                  `INSERT INTO conversations (user_id, character_id, role, message, message_type, is_guest_message, timestamp)
               VALUES (?, ?, ?, ?, 'normal', 1, CURRENT_TIMESTAMP)`
                ).bind(user.id, characterId, entry.role, entry.content).run();
              } catch (error) {
                await env.DB.prepare(
                  `INSERT INTO conversations (user_id, character_id, role, message, message_type, is_guest_message, created_at)
               VALUES (?, ?, ?, ?, 'normal', 1, CURRENT_TIMESTAMP)`
                ).bind(user.id, characterId, entry.role, entry.content).run();
              }
            }
            conversationHistory = [...sanitizedHistory, ...dbHistory];
          } else {
            conversationHistory = dbHistory;
          }
        } else {
          conversationHistory = sanitizedHistory;
        }
        console.log("[consult] \u4F1A\u8A71\u5C65\u6B74:", conversationHistory.length, "\u4EF6");
        if (user?.guardian && user.guardian.trim() !== "" && characterId === "kaede") {
          const guardianName = user.guardian;
          const userNickname = user.nickname || "\u3042\u306A\u305F";
          const guardianConfirmationMessage = `${userNickname}\u3055\u3093\u306E\u5B88\u8B77\u795E\u306F${guardianName}\u3067\u3059\u3002\u3053\u308C\u304B\u3089\u306F\u3001\u79C1\u3068\u5B88\u8B77\u795E\u3067\u3042\u308B${guardianName}\u304C\u9451\u5B9A\u3092\u9032\u3081\u3066\u3044\u304D\u307E\u3059\u3002`;
          const hasGuardianMessage = conversationHistory.some(
            (msg) => msg.role === "assistant" && msg.content.includes(`${userNickname}\u3055\u3093\u306E\u5B88\u8B77\u795E\u306F${guardianName}\u3067\u3059`)
          );
          if (!hasGuardianMessage) {
            conversationHistory.unshift({
              role: "assistant",
              content: guardianConfirmationMessage
            });
            console.log("[consult] \u5B88\u8B77\u795E\u78BA\u8A8D\u30E1\u30C3\u30BB\u30FC\u30B8\u3092\u4F1A\u8A71\u5C65\u6B74\u306B\u6CE8\u5165\u3057\u307E\u3057\u305F");
          }
        }
        let userMessageCount;
        if (!user) {
          userMessageCount = sanitizedGuestCount + 1;
          console.log("[consult] \u30B2\u30B9\u30C8\u30E6\u30FC\u30B6\u30FC\u306E\u30E1\u30C3\u30BB\u30FC\u30B8\u6570\uFF08guestMetadata\u512A\u5148\uFF09:", {
            sanitizedGuestCount,
            userMessageCount,
            conversationHistoryLength: conversationHistory.length
          });
        } else {
          const userMessagesInHistory = conversationHistory.filter((msg) => msg.role === "user").length;
          userMessageCount = userMessagesInHistory + 1;
          console.log("[consult] \u767B\u9332\u30E6\u30FC\u30B6\u30FC\u306E\u30E1\u30C3\u30BB\u30FC\u30B8\u6570\uFF08\u5C65\u6B74\u304B\u3089\u8A08\u7B97\uFF09:", {
            userMessagesInHistory,
            userMessageCount,
            conversationHistoryLength: conversationHistory.length
          });
        }
        const shouldEncourageRegistration = !user && sanitizedGuestCount >= 8 && sanitizedGuestCount < GUEST_MESSAGE_LIMIT;
        const isRitualStart = trimmedMessage.includes("\u5B88\u8B77\u795E\u306E\u5100\u5F0F\u3092\u59CB\u3081\u3066\u304F\u3060\u3055\u3044") || trimmedMessage.includes("\u5B88\u8B77\u795E\u306E\u5100\u5F0F\u3092\u59CB\u3081\u3066") || trimmedMessage === "\u5B88\u8B77\u795E\u306E\u5100\u5F0F\u3092\u59CB\u3081\u3066\u304F\u3060\u3055\u3044";
        const systemPrompt = generateSystemPrompt(characterId, {
          encourageRegistration: shouldEncourageRegistration,
          userNickname: user?.nickname,
          hasPreviousConversation: conversationHistory.length > 0,
          conversationHistoryLength: conversationHistory.length,
          userMessageCount,
          isRitualStart,
          guardian: user?.guardian || null
        });
        console.log("[consult] \u30B7\u30B9\u30C6\u30E0\u30D7\u30ED\u30F3\u30D7\u30C8\u751F\u6210:", {
          characterId,
          userNickname: user?.nickname,
          guardian: user?.guardian,
          userMessageCount,
          shouldEncourageRegistration,
          isRitualStart
        });
        const fallbackApiKey = env["GPT-API"] || env.OPENAI_API_KEY || env.FALLBACK_OPENAI_API_KEY;
        const fallbackModel = env.OPENAI_MODEL || env.FALLBACK_OPENAI_MODEL || DEFAULT_FALLBACK_MODEL;
        const llmResult = await getLLMResponse({
          systemPrompt,
          conversationHistory,
          userMessage: trimmedMessage,
          temperature: 0.5,
          maxTokens: 800,
          topP: 0.8,
          deepseekApiKey: apiKey,
          fallbackApiKey,
          fallbackModel
        });
        if (!llmResult.success || !llmResult.message) {
          const errorMessage = llmResult.error || "\u7533\u3057\u8A33\u3054\u3056\u3044\u307E\u305B\u3093\u304C\u3001\u5FDC\u7B54\u3092\u751F\u6210\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002";
          return new Response(
            JSON.stringify({
              error: errorMessage,
              message: "",
              character: characterId,
              characterName,
              isInappropriate: false,
              detectedKeywords: []
            }),
            { status: llmResult.status || 503, headers: corsHeaders3 }
          );
        }
        const responseMessage = llmResult.message;
        console.log("[consult] LLM\u5FDC\u7B54\u53D6\u5F97\u6210\u529F:", {
          provider: llmResult.provider,
          messageLength: responseMessage.length
        });
        const tarotKeywords = [
          "\u30BF\u30ED\u30C3\u30C8",
          "\u30BF\u30ED\u30C3\u30C8\u30AB\u30FC\u30C9",
          "\u30AB\u30FC\u30C9\u3092",
          "\u30AB\u30FC\u30C9\u3092\u3081\u304F",
          "\u30AB\u30FC\u30C9\u3092\u5360",
          "\u30AB\u30FC\u30C9\u3092\u5F15"
        ];
        const showTarotCard = characterId === "yukino" && tarotKeywords.some((keyword) => responseMessage.includes(keyword));
        const shouldClearChat = body.ritualStart === true;
        if (user && !shouldClearChat) {
          const messageCountResult = await env.DB.prepare(
            `SELECT COUNT(*) as count 
         FROM conversations 
         WHERE user_id = ? AND character_id = ?`
          ).bind(user.id, characterId).first();
          const messageCount = messageCountResult?.count || 0;
          if (messageCount >= 100) {
            const deleteCount = messageCount - 100 + 2;
            await env.DB.prepare(
              `DELETE FROM conversations
           WHERE user_id = ? AND character_id = ?
           AND id IN (
             SELECT id FROM conversations
             WHERE user_id = ? AND character_id = ?
             ORDER BY COALESCE(timestamp, created_at) ASC
             LIMIT ?
           )`
            ).bind(user.id, characterId, user.id, characterId, deleteCount).run();
          }
          try {
            await env.DB.prepare(
              `INSERT INTO conversations (user_id, character_id, role, message, message_type, is_guest_message, timestamp)
           VALUES (?, ?, 'user', ?, 'normal', 0, CURRENT_TIMESTAMP)`
            ).bind(user.id, characterId, trimmedMessage).run();
          } catch {
            await env.DB.prepare(
              `INSERT INTO conversations (user_id, character_id, role, message, message_type, is_guest_message, created_at)
           VALUES (?, ?, 'user', ?, 'normal', 0, CURRENT_TIMESTAMP)`
            ).bind(user.id, characterId, trimmedMessage).run();
          }
          try {
            await env.DB.prepare(
              `INSERT INTO conversations (user_id, character_id, role, message, message_type, is_guest_message, timestamp)
           VALUES (?, ?, 'assistant', ?, 'normal', 0, CURRENT_TIMESTAMP)`
            ).bind(user.id, characterId, responseMessage).run();
          } catch {
            await env.DB.prepare(
              `INSERT INTO conversations (user_id, character_id, role, message, message_type, is_guest_message, created_at)
           VALUES (?, ?, 'assistant', ?, 'normal', 0, CURRENT_TIMESTAMP)`
            ).bind(user.id, characterId, responseMessage).run();
          }
          console.log("[consult] \u4F1A\u8A71\u5C65\u6B74\u3092\u4FDD\u5B58\u3057\u307E\u3057\u305F");
        }
        return new Response(
          JSON.stringify({
            message: responseMessage,
            character: characterId,
            characterName,
            isInappropriate: false,
            detectedKeywords: [],
            registrationSuggested: shouldEncourageRegistration,
            guestMode: !user,
            remainingGuestMessages: user ? void 0 : Math.max(0, GUEST_MESSAGE_LIMIT - (sanitizedGuestCount + 1)),
            showTarotCard,
            provider: llmResult.provider,
            clearChat: shouldClearChat
            // 儀式開始時はチャットクリア指示
          }),
          { status: 200, headers: corsHeaders3 }
        );
      } catch (error) {
        console.error("[consult] \u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F:", error);
        return new Response(
          JSON.stringify({
            error: "Internal server error",
            message: error instanceof Error ? error.message : "Unknown error",
            character: "",
            characterName: "",
            isInappropriate: false,
            detectedKeywords: []
          }),
          {
            status: 500,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "POST, OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type",
              "Content-Type": "application/json"
            }
          }
        );
      }
    }, "onRequestPost");
  }
});
var import_token6;
var MAX_MESSAGES_PER_CHARACTER2;
var corsHeaders2;
var onRequestPost7;
var onRequestGet2;
var init_conversation = __esm({
  "api/conversation.ts"() {
    init_functionsRoutes_0_18170136633384493();
    init_checked_fetch();
    import_token6 = __toESM(require_token());
    MAX_MESSAGES_PER_CHARACTER2 = 100;
    corsHeaders2 = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Content-Type": "application/json"
    };
    onRequestPost7 = /* @__PURE__ */ __name2(async (context) => {
      const { request, env } = context;
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders2 });
      }
      try {
        const body = await request.json();
        if (!body.character || !body.role || !body.content) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "character, role, and content are required"
            }),
            { status: 400, headers: corsHeaders2 }
          );
        }
        if (!["kaede", "yukino", "sora", "kaon"].includes(body.character)) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Invalid character_id"
            }),
            { status: 400, headers: corsHeaders2 }
          );
        }
        if (!["user", "assistant"].includes(body.role)) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Invalid role"
            }),
            { status: 400, headers: corsHeaders2 }
          );
        }
        let userId = null;
        if (body.userToken) {
          const tokenPayload = await (0, import_token6.verifyUserToken)(body.userToken, env.AUTH_SECRET);
          if (!tokenPayload) {
            return new Response(
              JSON.stringify({
                success: false,
                error: "Invalid user token"
              }),
              { status: 401, headers: corsHeaders2 }
            );
          }
          userId = tokenPayload.userId;
        } else if (!body.isGuestMessage) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "userToken is required for registered users"
            }),
            { status: 401, headers: corsHeaders2 }
          );
        }
        if (body.isGuestMessage && !userId) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Guest messages should be handled by client-side storage"
            }),
            { status: 400, headers: corsHeaders2 }
          );
        }
        if (!userId) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "User ID is required"
            }),
            { status: 401, headers: corsHeaders2 }
          );
        }
        const messageCountResult = await env.DB.prepare(
          `SELECT COUNT(*) as count 
       FROM conversations 
       WHERE user_id = ? AND character_id = ?`
        ).bind(userId, body.character).first();
        const messageCount = messageCountResult?.count || 0;
        if (messageCount >= MAX_MESSAGES_PER_CHARACTER2) {
          const deleteCount = messageCount - MAX_MESSAGES_PER_CHARACTER2 + 1;
          await env.DB.prepare(
            `DELETE FROM conversations
         WHERE user_id = ? AND character_id = ?
         AND id IN (
           SELECT id FROM conversations
           WHERE user_id = ? AND character_id = ?
           ORDER BY timestamp ASC
           LIMIT ?
         )`
          ).bind(userId, body.character, userId, body.character, deleteCount).run();
        }
        const messageType = body.messageType || "normal";
        const isGuestMessage = body.isGuestMessage ? 1 : 0;
        const result = await env.DB.prepare(
          `INSERT INTO conversations 
       (user_id, character_id, role, content, message_type, is_guest_message, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
        ).bind(userId, body.character, body.role, body.content, messageType, isGuestMessage).run();
        return new Response(
          JSON.stringify({
            success: true,
            messageId: result.meta.last_row_id,
            message: "Message saved successfully"
          }),
          { status: 200, headers: corsHeaders2 }
        );
      } catch (error) {
        console.error("Error in conversation POST:", error);
        return new Response(
          JSON.stringify({
            success: false,
            error: "Internal server error"
          }),
          { status: 500, headers: corsHeaders2 }
        );
      }
    }, "onRequestPost");
    onRequestGet2 = /* @__PURE__ */ __name2(async (context) => {
      const { request, env } = context;
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders2 });
      }
      try {
        const url = new URL(request.url);
        const userToken = url.searchParams.get("userToken");
        const character = url.searchParams.get("character") || "kaede";
        const limit = parseInt(url.searchParams.get("limit") || "100", 10);
        if (!userToken) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "userToken is required"
            }),
            { status: 400, headers: corsHeaders2 }
          );
        }
        const tokenPayload = await (0, import_token6.verifyUserToken)(userToken, env.AUTH_SECRET);
        if (!tokenPayload) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Invalid user token"
            }),
            { status: 401, headers: corsHeaders2 }
          );
        }
        const historyResults = await env.DB.prepare(
          `SELECT 
         id,
         role,
         content,
         timestamp,
         message_type,
         is_guest_message
       FROM conversations
       WHERE user_id = ? AND character_id = ?
       ORDER BY timestamp ASC
       LIMIT ?`
        ).bind(tokenPayload.userId, character, limit).all();
        return new Response(
          JSON.stringify({
            success: true,
            messages: historyResults.results || [],
            character,
            hasHistory: (historyResults.results?.length || 0) > 0
          }),
          { status: 200, headers: corsHeaders2 }
        );
      } catch (error) {
        console.error("Error in conversation GET:", error);
        return new Response(
          JSON.stringify({
            success: false,
            error: "Internal server error"
          }),
          { status: 500, headers: corsHeaders2 }
        );
      }
    }, "onRequestGet");
  }
});
var import_token7;
var onRequestGet3;
var init_conversation_history = __esm({
  "api/conversation-history.ts"() {
    init_functionsRoutes_0_18170136633384493();
    init_checked_fetch();
    import_token7 = __toESM(require_token());
    onRequestGet3 = /* @__PURE__ */ __name2(async (context) => {
      const { request, env } = context;
      const corsHeaders3 = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Content-Type": "application/json"
      };
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: corsHeaders3
        });
      }
      try {
        const url = new URL(request.url);
        const userToken = url.searchParams.get("userToken");
        const characterId = url.searchParams.get("character") || "kaede";
        if (!userToken) {
          return new Response(
            JSON.stringify({
              hasHistory: false,
              error: "userToken is required"
            }),
            {
              status: 400,
              headers: corsHeaders3
            }
          );
        }
        const tokenPayload = await (0, import_token7.verifyUserToken)(userToken, env.AUTH_SECRET);
        if (!tokenPayload) {
          return new Response(
            JSON.stringify({
              hasHistory: false,
              error: "invalid user token"
            }),
            { status: 401, headers: corsHeaders3 }
          );
        }
        const user = await env.DB.prepare(
          "SELECT id, nickname, birth_year, birth_month, birth_day, guardian FROM users WHERE id = ?"
        ).bind(tokenPayload.userId).first();
        if (!user) {
          return new Response(
            JSON.stringify({
              hasHistory: false,
              error: "user not found"
            }),
            { status: 404, headers: corsHeaders3 }
          );
        }
        const historyResults = await env.DB.prepare(
          `SELECT role, message, COALESCE(timestamp, created_at) as created_at
       FROM conversations
       WHERE user_id = ? AND character_id = ?
       ORDER BY COALESCE(timestamp, created_at) DESC
       LIMIT 20`
        ).bind(user.id, characterId).all();
        const conversations = historyResults.results || [];
        const isAfterRitual = !!user.guardian;
        if (conversations.length === 0) {
          return new Response(
            JSON.stringify({
              hasHistory: false,
              nickname: user.nickname,
              birthYear: user.birth_year,
              birthMonth: user.birth_month,
              birthDay: user.birth_day,
              assignedDeity: user.guardian,
              clearChat: isAfterRitual
              // 儀式完了後の場合はチャットクリア指示
            }),
            { status: 200, headers: corsHeaders3 }
          );
        }
        const sortedConversations = conversations.slice().reverse();
        const lastConversationDate = sortedConversations.length > 0 ? sortedConversations[sortedConversations.length - 1].created_at : null;
        const recentMessages = sortedConversations.slice(-10).map((row) => ({
          role: row.role,
          content: row.message,
          created_at: row.created_at
        }));
        const lastMessages = sortedConversations.slice(-6);
        const conversationText = lastMessages.map((msg) => `${msg.role === "user" ? "\u30E6\u30FC\u30B6\u30FC" : "\u9451\u5B9A\u58EB"}: ${msg.message}`).join("\n");
        let firstQuestion = void 0;
        if (isAfterRitual) {
          const today = /* @__PURE__ */ new Date();
          const todayStr = today.toISOString().split("T")[0];
          const todayMessages = sortedConversations.filter((msg) => {
            if (msg.role !== "user") return false;
            if (!msg.created_at) return false;
            return msg.created_at.startsWith(todayStr);
          });
          if (todayMessages.length > 0) {
            firstQuestion = todayMessages[0].message;
            console.log("[conversation-history] \u4ECA\u65E5\u306EfirstQuestion\u53D6\u5F97:", {
              message: firstQuestion.substring(0, 50) + "...",
              created_at: todayMessages[0].created_at,
              todayStr,
              totalTodayUserMessages: todayMessages.length,
              totalUserMessages: sortedConversations.filter((m) => m.role === "user").length
            });
          } else {
            console.log("[conversation-history] \u4ECA\u65E5\u306EfirstQuestion\u53D6\u5F97\u5931\u6557:", {
              todayStr,
              totalUserMessages: sortedConversations.filter((m) => m.role === "user").length,
              allDates: sortedConversations.filter((m) => m.role === "user").map((m) => m.created_at).slice(0, 5)
            });
          }
        }
        return new Response(
          JSON.stringify({
            hasHistory: true,
            nickname: user.nickname,
            birthYear: user.birth_year,
            birthMonth: user.birth_month,
            birthDay: user.birth_day,
            assignedDeity: user.guardian,
            // guardianカラムから取得
            lastConversationDate,
            recentMessages,
            conversationSummary: conversationText,
            clearChat: isAfterRitual,
            // 儀式完了後の場合はチャットクリア指示
            firstQuestion
            // 最初の質問（儀式完了後の定型文で使用）
          }),
          { status: 200, headers: corsHeaders3 }
        );
      } catch (error) {
        console.error("Error in conversation-history endpoint:", error);
        return new Response(
          JSON.stringify({
            hasHistory: false,
            error: "Internal server error"
          }),
          {
            status: 500,
            headers: corsHeaders3
          }
        );
      }
    }, "onRequestGet");
  }
});
var import_token8;
var onRequestGet4;
var init_last_conversations = __esm({
  "api/last-conversations.ts"() {
    init_functionsRoutes_0_18170136633384493();
    init_checked_fetch();
    import_token8 = __toESM(require_token());
    onRequestGet4 = /* @__PURE__ */ __name2(async (context) => {
      const { request, env } = context;
      const corsHeaders3 = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Content-Type": "application/json"
      };
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: corsHeaders3
        });
      }
      try {
        const url = new URL(request.url);
        const userToken = url.searchParams.get("userToken");
        if (!userToken) {
          return new Response(
            JSON.stringify({
              lastConversations: {},
              error: "userToken is required"
            }),
            {
              status: 400,
              headers: corsHeaders3
            }
          );
        }
        const tokenPayload = await (0, import_token8.verifyUserToken)(userToken, env.AUTH_SECRET);
        if (!tokenPayload) {
          return new Response(
            JSON.stringify({
              lastConversations: {},
              error: "invalid user token"
            }),
            { status: 401, headers: corsHeaders3 }
          );
        }
        const user = await env.DB.prepare(
          "SELECT id, nickname, guardian FROM users WHERE id = ?"
        ).bind(tokenPayload.userId).first();
        if (!user) {
          return new Response(
            JSON.stringify({
              lastConversations: {},
              error: "user not found"
            }),
            { status: 404, headers: corsHeaders3 }
          );
        }
        const lastConversationsResult = await env.DB.prepare(
          `SELECT character_id, MAX(COALESCE(timestamp, created_at)) as last_conversation_date
       FROM conversations
       WHERE user_id = ?
       GROUP BY character_id`
        ).bind(user.id).all();
        const lastConversations = {
          kaede: null,
          yukino: null,
          sora: null,
          kaon: null
        };
        if (lastConversationsResult.results) {
          for (const row of lastConversationsResult.results) {
            if (row.character_id && lastConversations.hasOwnProperty(row.character_id)) {
              lastConversations[row.character_id] = row.last_conversation_date || null;
            }
          }
        }
        return new Response(
          JSON.stringify({
            lastConversations,
            nickname: user.nickname
          }),
          { status: 200, headers: corsHeaders3 }
        );
      } catch (error) {
        console.error("Error in last-conversations endpoint:", error);
        return new Response(
          JSON.stringify({
            lastConversations: {},
            error: "Internal server error"
          }),
          {
            status: 500,
            headers: corsHeaders3
          }
        );
      }
    }, "onRequestGet");
  }
});
var routes;
var init_functionsRoutes_0_18170136633384493 = __esm({
  "../.wrangler/tmp/pages-tdhAkN/functionsRoutes-0.18170136633384493.mjs"() {
    init_login();
    init_register();
    init_reset_passphrase();
    init_update_deity();
    init_conversations();
    init_users();
    init_cleanup_conversations();
    init_cleanup_conversations();
    init_consult();
    init_conversation();
    init_conversation();
    init_conversation_history();
    init_last_conversations();
    routes = [
      {
        routePath: "/api/auth/login",
        mountPath: "/api/auth",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost]
      },
      {
        routePath: "/api/auth/register",
        mountPath: "/api/auth",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost2]
      },
      {
        routePath: "/api/auth/reset-passphrase",
        mountPath: "/api/auth",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost3]
      },
      {
        routePath: "/api/auth/update-deity",
        mountPath: "/api/auth",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost4]
      },
      {
        routePath: "/api/admin/conversations",
        mountPath: "/api/admin",
        method: "",
        middlewares: [],
        modules: [onRequest]
      },
      {
        routePath: "/api/admin/users",
        mountPath: "/api/admin",
        method: "",
        middlewares: [],
        modules: [onRequest2]
      },
      {
        routePath: "/api/cleanup-conversations",
        mountPath: "/api",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet]
      },
      {
        routePath: "/api/cleanup-conversations",
        mountPath: "/api",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost5]
      },
      {
        routePath: "/api/consult",
        mountPath: "/api",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost6]
      },
      {
        routePath: "/api/conversation",
        mountPath: "/api",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet2]
      },
      {
        routePath: "/api/conversation",
        mountPath: "/api",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost7]
      },
      {
        routePath: "/api/conversation-history",
        mountPath: "/api",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet3]
      },
      {
        routePath: "/api/last-conversations",
        mountPath: "/api",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet4]
      }
    ];
  }
});
init_functionsRoutes_0_18170136633384493();
init_checked_fetch();
init_functionsRoutes_0_18170136633384493();
init_checked_fetch();
init_functionsRoutes_0_18170136633384493();
init_checked_fetch();
init_functionsRoutes_0_18170136633384493();
init_checked_fetch();
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
__name2(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name2(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name2(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name2(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name2(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name2(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
__name2(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
__name2(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name2(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
__name2(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
__name2(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
__name2(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
__name2(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
__name2(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
__name2(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
__name2(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");
__name2(pathToRegexp, "pathToRegexp");
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
__name2(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name2(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name2(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name2((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
init_functionsRoutes_0_18170136633384493();
init_checked_fetch();
var drainBody = /* @__PURE__ */ __name2(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;
init_functionsRoutes_0_18170136633384493();
init_checked_fetch();
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
__name2(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name2(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = pages_template_worker_default;
init_functionsRoutes_0_18170136633384493();
init_checked_fetch();
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
__name2(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
__name2(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");
__name2(__facade_invoke__, "__facade_invoke__");
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  static {
    __name(this, "___Facade_ScheduledController__");
  }
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name2(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name2(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name2(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
__name2(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name2((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name2((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
__name2(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;

// ../../AppData/Roaming/npm/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody2 = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default2 = drainBody2;

// ../../AppData/Roaming/npm/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError2(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError2(e.cause)
  };
}
__name(reduceError2, "reduceError");
var jsonError2 = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError2(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default2 = jsonError2;

// .wrangler/tmp/bundle-9GwSE9/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__2 = [
  middleware_ensure_req_body_drained_default2,
  middleware_miniflare3_json_error_default2
];
var middleware_insertion_facade_default2 = middleware_loader_entry_default;

// ../../AppData/Roaming/npm/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__2 = [];
function __facade_register__2(...args) {
  __facade_middleware__2.push(...args.flat());
}
__name(__facade_register__2, "__facade_register__");
function __facade_invokeChain__2(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__2(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__2, "__facade_invokeChain__");
function __facade_invoke__2(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__2(request, env, ctx, dispatch, [
    ...__facade_middleware__2,
    finalMiddleware
  ]);
}
__name(__facade_invoke__2, "__facade_invoke__");

// .wrangler/tmp/bundle-9GwSE9/middleware-loader.entry.ts
var __Facade_ScheduledController__2 = class ___Facade_ScheduledController__2 {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__2)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler2(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__2(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__2(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler2, "wrapExportedHandler");
function wrapWorkerEntrypoint2(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__2(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__2(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint2, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY2;
if (typeof middleware_insertion_facade_default2 === "object") {
  WRAPPED_ENTRY2 = wrapExportedHandler2(middleware_insertion_facade_default2);
} else if (typeof middleware_insertion_facade_default2 === "function") {
  WRAPPED_ENTRY2 = wrapWorkerEntrypoint2(middleware_insertion_facade_default2);
}
var middleware_loader_entry_default2 = WRAPPED_ENTRY2;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__2 as __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default2 as default
};
//# sourceMappingURL=functionsWorker-0.5506474401351913.js.map
