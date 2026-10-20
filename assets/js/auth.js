/* ==========================================================================
   小杨TK — 账号系统（浏览器本地存储版）
   --------------------------------------------------------------------------
   说明：这是纯前端账号系统，账号只存在于当前浏览器。
   密码不会明文保存，使用加盐 + 多轮 SHA-256 派生值。
   若要跨设备 / 真正安全，需要接入后端（Supabase / Firebase 等），
   届时只需替换本文件里的 read/write 存储层。
   ========================================================================== */

(function (global) {
  "use strict";

  const USERS_KEY = "xiaoyang_users_v1";
  const SESSION_KEY = "xiaoyang_session_v1";
  const ROUNDS = 20000;
  const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;

  /* 内置管理员账号
     由固定盐值 + 密码派生，任何设备打开后台都能登录。
     注意：这里只有派生值，没有明文密码；但派生值公开，请勿与其他网站共用密码。 */
  const BUILTIN_ADMIN = {
    id: "u_builtin_admin",
    username: "3435705521@qq.com",
    nickname: "店主",
    role: "admin",
    status: "active",
    salt: "GtP1YZCe4LVCM1RzxapVJg==",
    hash: "rxJka8uTGXdfX1Q0lu5JzrVSBIVU3l2wP6f/PNLs0x0=",
    createdAt: "2026-10-20T00:00:00.000Z",
    builtin: true
  };

  /* --- SHA-256 ---------------------------------------------------------- */

  const K = new Int32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ]);

  const rotr = (x, n) => (x >>> n) | (x << (32 - n));

  function sha256(bytes) {
    const H = new Int32Array([
      0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
      0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
    ]);
    const len = bytes.length;
    const total = ((len + 9 + 63) >> 6) << 6;
    const buf = new Uint8Array(total);
    buf.set(bytes);
    buf[len] = 0x80;
    const view = new DataView(buf.buffer);
    view.setUint32(total - 8, Math.floor(len / 536870912));
    view.setUint32(total - 4, (len << 3) >>> 0);

    const w = new Int32Array(64);
    for (let off = 0; off < total; off += 64) {
      for (let t = 0; t < 16; t += 1) w[t] = view.getInt32(off + t * 4);
      for (let t = 16; t < 64; t += 1) {
        const s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
        const s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
        w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
      }

      let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (let t = 0; t < 64; t += 1) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const ch = (e & f) ^ (~e & g);
        const t1 = (h + S1 + ch + K[t] + w[t]) | 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + maj) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0;
        d = c; c = b; b = a; a = (t1 + t2) | 0;
      }

      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }

    const out = new Uint8Array(32);
    const outView = new DataView(out.buffer);
    for (let i = 0; i < 8; i += 1) outView.setInt32(i * 4, H[i]);
    return out;
  }

  const utf8 = (str) => new TextEncoder().encode(str);

  const toHex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

  const toB64 = (bytes) => {
    let bin = "";
    for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  };

  const fromB64 = (str) => {
    const bin = atob(str);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
    return out;
  };

  function concat(a, b) {
    const out = new Uint8Array(a.length + b.length);
    out.set(a);
    out.set(b, a.length);
    return out;
  }

  function derive(password, salt) {
    const pw = utf8(password);
    let acc = sha256(concat(salt, pw));
    for (let i = 1; i < ROUNDS; i += 1) acc = sha256(concat(acc, salt));
    return toB64(acc);
  }

  function newSalt() {
    const salt = new Uint8Array(16);
    if (global.crypto && global.crypto.getRandomValues) {
      global.crypto.getRandomValues(salt);
    } else {
      for (let i = 0; i < salt.length; i += 1) salt[i] = Math.floor(Math.random() * 256);
    }
    return salt;
  }

  /* --- 存储层（接后端时替换这里） --------------------------------------- */

  function readUsers() {
    let list;
    try {
      const raw = localStorage.getItem(USERS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      list = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      list = [];
    }

    if (!list.some((user) => user.id === BUILTIN_ADMIN.id)) {
      list = [BUILTIN_ADMIN, ...list];
      try {
        localStorage.setItem(USERS_KEY, JSON.stringify(list));
      } catch (e) { /* 存储不可用时仅本次生效 */ }
    }

    return list;
  }

  function writeUsers(list) {
    localStorage.setItem(USERS_KEY, JSON.stringify(list));
  }

  function readSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function writeSession(session) {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  }

  /* --- 校验 -------------------------------------------------------------- */

  const NAME_RE = /^[\w\u4e00-\u9fa5]{2,20}$/;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function normalize(name) {
    return String(name || "").trim().toLowerCase();
  }

  function checkUsername(username) {
    const name = String(username || "").trim();
    if (name.includes("@")) {
      if (!EMAIL_RE.test(name) || name.length > 60) {
        throw new Error("邮箱格式不正确");
      }
      return;
    }
    if (!NAME_RE.test(name)) {
      throw new Error("账号需为 2–20 位中文、字母、数字或下划线");
    }
  }

  function checkPassword(password) {
    if (String(password || "").length < 8) {
      throw new Error("密码至少 8 位");
    }
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

  function makeSession(user, ttl) {
    const session = {
      uid: user.id,
      username: user.username,
      nickname: user.nickname || user.username,
      role: user.role,
      exp: Date.now() + ttl
    };
    writeSession(session);
    return session;
  }

  /* --- 对外 API ---------------------------------------------------------- */

  const Auth = {
    hasAdmin() {
      return readUsers().some((user) => user.role === "admin");
    },

    /** 创建第一个管理员账号 */
    createAdmin({ username, password, nickname }) {
      const name = String(username || "").trim();
      checkUsername(name);
      checkPassword(password);
      const users = readUsers();
      if (users.some((user) => normalize(user.username) === normalize(name))) {
        throw new Error("该账号已存在");
      }
      const salt = newSalt();
      const user = {
        id: `u_${Date.now().toString(36)}`,
        username: name,
        nickname: (nickname || name).trim(),
        role: "admin",
        status: "active",
        salt: toB64(salt),
        hash: derive(password, salt),
        createdAt: new Date().toISOString()
      };
      users.push(user);
      writeUsers(users);
      return makeSession(user, SESSION_TTL);
    },

    register({ username, password, nickname }) {
      const name = String(username || "").trim();
      checkUsername(name);
      checkPassword(password);
      const users = readUsers();
      if (users.some((user) => normalize(user.username) === normalize(name))) {
        throw new Error("该账号已被注册");
      }
      const salt = newSalt();
      const user = {
        id: `u_${Date.now().toString(36)}`,
        username: name,
        nickname: (nickname || name).trim(),
        role: "user",
        status: "active",
        salt: toB64(salt),
        hash: derive(password, salt),
        createdAt: new Date().toISOString()
      };
      users.push(user);
      writeUsers(users);
      return makeSession(user, SESSION_TTL);
    },

    login(username, password, remember) {
      const users = readUsers();
      const user = users.find((item) => normalize(item.username) === normalize(username));
      if (!user) throw new Error("账号或密码不正确");
      const hash = derive(String(password || ""), fromB64(user.salt));
      if (hash !== user.hash) throw new Error("账号或密码不正确");
      if (user.status === "disabled") throw new Error("该账号已被停用");
      const ttl = remember ? SESSION_TTL : 6 * 60 * 60 * 1000;
      return makeSession(user, ttl);
    },

    logout() {
      writeSession(null);
    },

    /** 当前会话（自动处理过期） */
    session() {
      const session = readSession();
      if (!session) return null;
      if (!session.exp || session.exp < Date.now()) {
        writeSession(null);
        return null;
      }
      const user = readUsers().find((item) => item.id === session.uid);
      if (!user || user.status === "disabled") {
        writeSession(null);
        return null;
      }
      return session;
    },

    /** 管理员专用：所有账号（不含密码材料） */
    list() {
      return readUsers().map(publicUser);
    },

    /** 是否内置店主管理员（唯一允许进入后台的账号） */
    isOwner(session) {
      if (!session || session.uid !== BUILTIN_ADMIN.id) return false;
      const user = readUsers().find((item) => item.id === BUILTIN_ADMIN.id);
      return !!user && user.role === "admin" && user.hash === BUILTIN_ADMIN.hash;
    },

    setStatus(id, status) {
      const users = readUsers();
      const user = users.find((item) => item.id === id);
      if (!user) throw new Error("账号不存在");
      if (user.role === "admin") throw new Error("管理员账号不能停用");
      user.status = status === "disabled" ? "disabled" : "active";
      writeUsers(users);
    },

    remove(id) {
      const users = readUsers();
      const user = users.find((item) => item.id === id);
      if (!user) throw new Error("账号不存在");
      if (user.role === "admin") throw new Error("管理员账号不能删除");
      writeUsers(users.filter((item) => item.id !== id));
    },

    /** 仅供自查：SHA-256 十六进制摘要 */
    _digest(text) {
      return toHex(sha256(utf8(text)));
    },

    /** 仅供生成内置账号凭据使用 */
    _derive(password, saltB64) {
      return derive(String(password), fromB64(saltB64));
    }
  };

  global.Auth = Auth;
})(window);
