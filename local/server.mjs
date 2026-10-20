/* 小杨TK — 本地账号服务
   用途：把账号数据保存到本机固定目录，而不是浏览器里。
   只监听 127.0.0.1，不对外网开放。
   启动：node local/server.mjs
*/

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = path.resolve(__dirname, "..");
const DATA_DIR = process.env.XIAOYANGTK_DATA_DIR || "C:\\Users\\Y\\Documents\\Codex\\xiaoyangtk-data";
const ACCOUNTS_FILE = path.join(DATA_DIR, "accounts.json");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");
const PORT = Number(process.env.XIAOYANGTK_PORT || 8787);

/* 允许公网站点直接调用本机服务（仅这几个来源） */
const ALLOWED_ORIGINS = new Set([
  "http://www.xiaoyangtk.xin",
  "http://xiaoyangtk.xin",
  `http://127.0.0.1:${PORT}`,
  `http://localhost:${PORT}`
]);

const ROUNDS = 20000;
const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;
const SHORT_TTL = 6 * 60 * 60 * 1000;

/* 内置店主账号（与浏览器版保持一致） */
const OWNER_ID = "u_builtin_admin";
const OWNER = {
  id: OWNER_ID,
  username: "3435705521@qq.com",
  nickname: "店主",
  role: "admin",
  status: "active",
  salt: "GtP1YZCe4LVCM1RzxapVJg==",
  hash: "rxJka8uTGXdfX1Q0lu5JzrVSBIVU3l2wP6f/PNLs0x0=",
  createdAt: "2026-10-20T00:00:00.000Z",
  builtin: true
};

/* --- 密码派生（与前端同一套算法） -------------------------------------- */

function derive(password, salt) {
  const pw = Buffer.from(String(password), "utf8");
  let acc = crypto.createHash("sha256").update(Buffer.concat([salt, pw])).digest();
  for (let i = 1; i < ROUNDS; i += 1) {
    acc = crypto.createHash("sha256").update(Buffer.concat([acc, salt])).digest();
  }
  return acc.toString("base64");
}

function newSalt() {
  return crypto.randomBytes(16);
}

/* --- 存储 ---------------------------------------------------------------- */

function ensureDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    return fallback;
  }
}

function writeJson(file, value) {
  ensureDir();
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), "utf8");
  fs.renameSync(tmp, file);
}

let db = readJson(ACCOUNTS_FILE, { version: 1, users: [] });
if (!db || !Array.isArray(db.users)) db = { version: 1, users: [] };
if (!db.users.some((user) => user.id === OWNER_ID)) {
  db.users = [OWNER, ...db.users];
  writeJson(ACCOUNTS_FILE, db);
}

let sessions = readJson(SESSIONS_FILE, {});
if (!sessions || typeof sessions !== "object") sessions = {};

/* 启动时清掉过期会话，避免 sessions.json 无限增长 */
function pruneSessions() {
  const now = Date.now();
  let changed = false;
  for (const [token, entry] of Object.entries(sessions)) {
    if (!entry || !entry.exp || entry.exp < now) {
      delete sessions[token];
      changed = true;
    }
  }
  if (changed) {
    try {
      fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), "utf8");
    } catch (e) { /* ignore */ }
  }
}

pruneSessions();

function saveUsers() {
  writeJson(ACCOUNTS_FILE, db);
}

function saveSessions() {
  writeJson(SESSIONS_FILE, sessions);
}

/* --- 账号规则 ------------------------------------------------------------ */

const NAME_RE = /^[\w\u4e00-\u9fa5]{2,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const norm = (name) => String(name || "").trim().toLowerCase();

function checkUsername(username) {
  const name = String(username || "").trim();
  if (name.includes("@")) {
    if (!EMAIL_RE.test(name) || name.length > 60) throw new Error("邮箱格式不正确");
    return;
  }
  if (!NAME_RE.test(name)) throw new Error("账号需为 2–20 位中文、字母、数字或下划线");
}

function checkPassword(password) {
  if (String(password || "").length < 8) throw new Error("密码至少 8 位");
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    nickname: user.nickname || user.username,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt
  };
}

function sessionOf(user, ttl) {
  return {
    uid: user.id,
    username: user.username,
    nickname: user.nickname || user.username,
    role: user.role,
    createdAt: user.createdAt,
    exp: Date.now() + ttl,
    owner: user.id === OWNER_ID
  };
}

function issueSession(user, ttl) {
  const token = crypto.randomBytes(24).toString("hex");
  sessions[token] = { uid: user.id, exp: Date.now() + ttl };
  saveSessions();
  return { token, session: sessionOf(user, ttl) };
}

function tokenOf(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

function authUser(req) {
  const token = tokenOf(req);
  const entry = token ? sessions[token] : null;
  if (!entry || entry.exp < Date.now()) return null;
  const user = db.users.find((item) => item.id === entry.uid);
  if (!user || user.status === "disabled") return null;
  return { user, token };
}

/* --- HTTP ---------------------------------------------------------------- */

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".ico": "image/x-icon"
};

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 1e6) {
        reject(new Error("请求体过大"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(new Error("请求格式错误"));
      }
    });
    req.on("error", reject);
  });
}

async function handleApi(req, res, url) {
  const route = url.pathname;
  const method = req.method || "GET";

  if (route === "/api/health") {
    sendJson(res, 200, {
      service: "xiaoyangtk-accounts",
      mode: "remote",
      dataDir: DATA_DIR,
      accountsFile: ACCOUNTS_FILE
    });
    return true;
  }

  if (route === "/api/register" && method === "POST") {
    const body = await readBody(req);
    const name = String(body.username || "").trim();
    checkUsername(name);
    checkPassword(body.password);
    if (db.users.some((user) => norm(user.username) === norm(name))) {
      sendJson(res, 409, { error: "该账号已被注册" });
      return true;
    }
    const salt = newSalt();
    const user = {
      id: `u_${Date.now().toString(36)}`,
      username: name,
      nickname: String(body.nickname || name).trim() || name,
      role: "user",
      status: "active",
      salt: salt.toString("base64"),
      hash: derive(body.password, salt),
      createdAt: new Date().toISOString()
    };
    db.users.push(user);
    saveUsers();
    const { token, session } = issueSession(user, SESSION_TTL);
    sendJson(res, 200, { token, session });
    return true;
  }

  if (route === "/api/login" && method === "POST") {
    const body = await readBody(req);
    const user = db.users.find((item) => norm(item.username) === norm(body.username));
    if (!user) {
      sendJson(res, 401, { error: "账号或密码不正确" });
      return true;
    }
    const hash = derive(body.password, Buffer.from(user.salt, "base64"));
    if (hash !== user.hash) {
      sendJson(res, 401, { error: "账号或密码不正确" });
      return true;
    }
    if (user.status === "disabled") {
      sendJson(res, 403, { error: "该账号已被停用" });
      return true;
    }
    const { token, session } = issueSession(user, body.remember ? SESSION_TTL : SHORT_TTL);
    sendJson(res, 200, { token, session });
    return true;
  }

  if (route === "/api/session") {
    const found = authUser(req);
    if (!found) {
      sendJson(res, 200, { session: null });
      return true;
    }
    sendJson(res, 200, {
      session: { ...sessionOf(found.user, 0), exp: sessions[found.token].exp }
    });
    return true;
  }

  if (route === "/api/logout" && method === "POST") {
    const token = tokenOf(req);
    if (token && sessions[token]) {
      delete sessions[token];
      saveSessions();
    }
    sendJson(res, 200, { ok: true });
    return true;
  }

  if (route === "/api/users" && method === "GET") {
    const found = authUser(req);
    if (!found || found.user.id !== OWNER_ID) {
      sendJson(res, 403, { error: "该账号没有后台权限" });
      return true;
    }
    sendJson(res, 200, { users: db.users.map(publicUser) });
    return true;
  }

  /* 后台发布后，把最新 data.js 同步到本地站点，避免本地预览和线上不一致 */
  if (route === "/api/shop-data" && method === "POST") {
    const found = authUser(req);
    if (!found || found.user.id !== OWNER_ID) {
      sendJson(res, 403, { error: "该账号没有后台权限" });
      return true;
    }
    const body = await readBody(req);
    const content = String(body.content || "");
    if (!content.trim().startsWith("window.SHOP")) {
      sendJson(res, 400, { error: "内容格式不正确" });
      return true;
    }
    const target = path.join(SITE_ROOT, "assets", "js", "data.js");
    fs.writeFileSync(`${target}.tmp`, content, "utf8");
    fs.renameSync(`${target}.tmp`, target);
    sendJson(res, 200, { ok: true });
    return true;
  }

  /* 账号数据备份：导出完整记录（含密码派生值，可原样恢复） */
  if (route === "/api/backup" && method === "GET") {
    const found = authUser(req);
    if (!found || found.user.id !== OWNER_ID) {
      sendJson(res, 403, { error: "该账号没有后台权限" });
      return true;
    }
    sendJson(res, 200, {
      version: db.version || 1,
      exportedAt: new Date().toISOString(),
      accounts: db.users
    });
    return true;
  }

  const patch = route.match(/^\/api\/users\/([^/]+)$/);
  if (patch && (method === "PATCH" || method === "DELETE")) {
    const found = authUser(req);
    if (!found || found.user.id !== OWNER_ID) {
      sendJson(res, 403, { error: "该账号没有后台权限" });
      return true;
    }
    const id = decodeURIComponent(patch[1]);
    const user = db.users.find((item) => item.id === id);
    if (!user) {
      sendJson(res, 404, { error: "账号不存在" });
      return true;
    }
    if (user.role === "admin") {
      sendJson(res, 400, { error: method === "DELETE" ? "管理员账号不能删除" : "管理员账号不能停用" });
      return true;
    }
    if (method === "DELETE") {
      db.users = db.users.filter((item) => item.id !== id);
      saveUsers();
      sendJson(res, 200, { ok: true });
      return true;
    }
    const body = await readBody(req);
    user.status = body.status === "disabled" ? "disabled" : "active";
    saveUsers();
    sendJson(res, 200, { ok: true });
    return true;
  }

  sendJson(res, 404, { error: "接口不存在" });
  return true;
}

function serveStatic(req, res, url) {
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") pathname = "/index.html";

  const target = path.join(SITE_ROOT, pathname);
  if (!target.startsWith(SITE_ROOT)) {
    res.writeHead(403).end("forbidden");
    return;
  }

  fs.readFile(target, (err, data) => {
    if (err) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("not found");
      return;
    }
    res.writeHead(200, {
      "content-type": MIME[path.extname(target).toLowerCase()] || "application/octet-stream",
      "cache-control": "no-store"
    });
    res.end(data);
  });
}

const server = http
  .createServer(async (req, res) => {
    const url = new URL(req.url || "/", `http://127.0.0.1:${PORT}`);
    const origin = req.headers.origin;

    if (origin && ALLOWED_ORIGINS.has(origin)) {
      res.setHeader("access-control-allow-origin", origin);
      res.setHeader("vary", "origin");
    }
    res.setHeader("access-control-allow-methods", "GET,POST,PATCH,DELETE,OPTIONS");
    res.setHeader("access-control-allow-headers", "authorization,content-type,accept");
    res.setHeader("access-control-allow-private-network", "true");
    res.setHeader("access-control-max-age", "600");

    if (req.method === "OPTIONS") {
      res.writeHead(origin && ALLOWED_ORIGINS.has(origin) ? 204 : 403);
      res.end();
      return;
    }

    try {
      if (url.pathname.startsWith("/api/")) {
        await handleApi(req, res, url);
        return;
      }
      serveStatic(req, res, url);
    } catch (err) {
      if (!res.headersSent) sendJson(res, 400, { error: err.message || "请求失败" });
    }
  })
  .listen(PORT, "127.0.0.1", () => {
    console.log("小杨TK 本地账号服务已启动");
    console.log(`  后台地址 ：http://127.0.0.1:${PORT}/admin.html`);
    console.log(`  账号数据 ：${ACCOUNTS_FILE}`);
    console.log(`  会话数据 ：${SESSIONS_FILE}`);
    console.log("  按 Ctrl+C 停止");
    openBrowser();
  });

function openBrowser() {
  if (process.env.XIAOYANGTK_NO_OPEN === "1") return;
  try {
    const child = spawn("cmd", ["/c", "start", "", `http://127.0.0.1:${PORT}/admin.html`], {
      detached: true,
      stdio: "ignore",
      windowsHide: true
    });
    child.unref();
  } catch (e) { /* 打不开浏览器不影响服务 */ }
}

server.on("error", (err) => {
  if (err && err.code === "EADDRINUSE") {
    console.log(`端口 ${PORT} 已被占用，服务可能已在运行。`);
    console.log(`正在打开：http://127.0.0.1:${PORT}/admin.html`);
    openBrowser();
    process.exit(0);
  }
  console.error("启动失败：", err);
  process.exit(1);
});
