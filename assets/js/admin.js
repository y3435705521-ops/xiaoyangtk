(function () {
  "use strict";

  const OWNER = "y3435705521-ops";
  const REPO = "xiaoyangtk";
  const BRANCH = "main";
  const DATA_PATH = "assets/js/data.js";
  const API = "https://api.github.com";

  const LS_TOKEN = "xiaoyang_admin_token_v1";
  const LS_DRAFT = "xiaoyang_admin_draft_v1";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  const CAT_COLORS = ["#111418", "#d97757", "#23262c", "#3d6b8f", "#6b4f9e", "#2f6b4f", "#a8722a"];
  const CAT_MARK = { gpt: "G", claude: "C", grok: "X" };

  function catColor(category, index) {
    if (category && category.color) return category.color;
    return CAT_COLORS[Math.max(0, (index || 1) - 1) % CAT_COLORS.length];
  }

  function avatarColor(name) {
    const text = String(name || "");
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
    return CAT_COLORS[hash % CAT_COLORS.length];
  }

  function userAvatar(user) {
    if (user.avatar) {
      return `<span class="uavatar"><img src="${esc(user.avatar)}" alt=""></span>`;
    }
    const name = String(user.nickname || user.username || "?").trim();
    return `<span class="uavatar" style="background:${avatarColor(user.username)}">${esc(name.slice(0, 1).toUpperCase())}</span>`;
  }

  const els = {
    conn: $("[data-conn]"),
    connText: $("[data-conn-text]"),
    save: $("[data-save]"),
    openAuth: $("[data-open-auth]"),
    rows: $("[data-rows]"),
    empty: $("[data-empty]"),
    count: $("[data-count]"),
    total: $("[data-total]"),
    search: $("[data-search]"),
    filter: $("[data-filter]"),
    newBtn: $("[data-new]"),
    exportBtn: $("[data-export]"),
    banner: $("[data-draft-banner]"),
    bannerTime: $("[data-draft-time]"),
    build: $("[data-build]"),
    retryBuild: $("[data-retry-build]"),
    toast: $("[data-toast]"),
    scrim: $("[data-scrim]"),
    auth: $("[data-auth]"),
    authErr: $("[data-auth-err]"),
    token: $("[data-token]"),
    remember: $("[data-remember]"),
    editor: $("[data-editor]"),
    editorTitle: $("[data-editor-title]"),
    skus: $("[data-skus]"),
    coverPreview: $("[data-cover-preview]"),
    coverEmpty: $("[data-cover-empty]"),
    uploadCover: $("[data-upload-cover]"),
    coverFile: $("[data-cover-file]"),
    catName: $("[data-cat-name]"),
    catEn: $("[data-cat-en]"),
    catMark: $("[data-cat-mark]"),
    catSave: $("[data-cat-save]"),
    catCancel: $("[data-cat-cancel]"),
    catRows: $("[data-cat-rows]"),
    catsEmpty: $("[data-cats-empty]"),
    app: $(".adm"),
    gate: $("[data-gate]"),
    gateForm: $("[data-gate-form]"),
    gateTitle: $("[data-gate-title]"),
    gateSub: $("[data-gate-sub]"),
    gateConfirm: $("[data-gate-confirm]"),
    gateErr: $("[data-gate-err]"),
    gateSubmit: $("[data-gate-submit]"),
    gateHint: $("[data-gate-hint]"),
    adminName: $("[data-admin-name]"),
    modeChip: $("[data-mode-chip]"),
    userRows: $("[data-user-rows]"),
    usersEmpty: $("[data-users-empty]"),
    userTotal: $("[data-user-total]")
  };

  const state = {
    shop: null,
    remoteJson: "",
    fileSha: null,
    dataSource: "local",
    token: "",
    dirty: false,
    lastCommit: null,
    editorIndex: -1,
    editing: null,
    pendingDelete: null,
    pendingUserDelete: null,
    catEditing: null,
    pendingCatDelete: null,
    busy: false,
    keyword: "",
    cat: "all",
    toastTimer: null
  };

  /* Utils ------------------------------------------------------------------ */

  const esc = (value) => String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  function money(value) {
    const num = Number(value) || 0;
    return Number.isInteger(num) ? String(num) : num.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  }

  function today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function formatTime(iso) {
    if (!iso) return "—";
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("zh-CN", { hour12: false });
  }

  function b64(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = "";
    for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  function unb64(content) {
    const bin = atob(String(content).replace(/\s/g, ""));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function toast(message, isError) {
    els.toast.textContent = message;
    els.toast.classList.toggle("is-error", !!isError);
    els.toast.hidden = false;
    window.clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(() => {
      els.toast.hidden = true;
    }, isError ? 6000 : 3200);
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  /* GitHub ----------------------------------------------------------------- */

  async function gh(path, options = {}) {
    const res = await fetch(API + path, {
      ...options,
      headers: {
        authorization: `Bearer ${state.token}`,
        accept: "application/vnd.github+json",
        "content-type": "application/json",
        "user-agent": "xiaoyangtk-admin",
        ...(options.headers || {})
      }
    });

    if (res.status === 404) {
      const err = new Error("not found");
      err.status = 404;
      throw err;
    }

    const text = await res.text();
    if (!res.ok) {
      let msg = text.slice(0, 240);
      try {
        const parsed = JSON.parse(text);
        msg = parsed.message || msg;
      } catch (e) { /* keep raw */ }
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }
    return text ? JSON.parse(text) : null;
  }

  async function fileSha() {
    try {
      const data = await gh(`/repos/${OWNER}/${REPO}/contents/${DATA_PATH}?ref=${BRANCH}`);
      return data && data.sha ? data.sha : null;
    } catch (err) {
      if (err.status === 404) return null;
      throw err;
    }
  }

  function setConnected(login) {
    if (login) {
      els.conn.classList.add("is-on");
      els.connText.textContent = `已连接 @${login}`;
      els.openAuth.textContent = "更换令牌";
    } else {
      els.conn.classList.remove("is-on");
      els.connText.textContent = "未连接 GitHub";
      els.openAuth.textContent = "连接";
    }
  }

  async function verifyToken(candidate) {
    state.token = candidate;
    const user = await gh("/user");
    const repoInfo = await gh(`/repos/${OWNER}/${REPO}`);
    const canWrite = repoInfo.permissions && (repoInfo.permissions.push || repoInfo.permissions.admin);
    if (!canWrite) {
      throw new Error("这个令牌对仓库没有写入权限");
    }
    setConnected(user.login);
    return user.login;
  }

  /* Data ------------------------------------------------------------------- */

  function parseShop(text) {
    const raw = String(text).trim();
    const body = raw.replace(/^window\.SHOP\s*=\s*/, "").replace(/;\s*$/, "");
    try {
      return JSON.parse(body);
    } catch (e) {
      // The file may be a plain JS object literal.
      return new Function(`return (${body});`)();
    }
  }

  function serializeShop(shop) {
    return `window.SHOP = ${JSON.stringify(shop, null, 2)};\n`;
  }

  async function loadData() {
    // 已连接 GitHub 时以仓库中的文件为准，避免用本地旧数据覆盖线上
    if (state.token) {
      try {
        const file = await gh(`/repos/${OWNER}/${REPO}/contents/${DATA_PATH}?ref=${BRANCH}`);
        const text = unb64(file.content);
        state.fileSha = file.sha;
        state.shop = parseShop(text);
        state.remoteJson = JSON.stringify(state.shop);
        state.dataSource = "repo";
        normalizeShop();
        return;
      } catch (err) {
        if (err.status !== 404) throw err;
        state.fileSha = null;
      }
    }

    const res = await fetch(`${DATA_PATH}?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`读取 data.js 失败（${res.status}）`);
    const text = await res.text();
    state.remoteJson = JSON.stringify(parseShop(text));
    state.shop = parseShop(text);
    state.dataSource = "local";
    normalizeShop();
  }

  function normalizeShop() {
    if (!Array.isArray(state.shop.products)) state.shop.products = [];
    state.shop.categories = state.shop.categories || [];
    state.shop.contact = state.shop.contact || { qq: "", hours: "" };
    state.shop.notice = state.shop.notice || { enabled: true, title: "进店必读", body: "" };
  }

  async function reloadFromRepo() {
    if (!state.token) return;
    try {
      state.fileSha = null;
      await loadData();
      state.dirty = false;
      renderAll();
      checkDraft();
      toast("已读取仓库中的最新数据");
    } catch (err) {
      toast(`读取仓库数据失败：${err.message}`, true);
    }
  }

  function markDirty() {
    state.dirty = true;
    saveDraft();
  }

  function saveDraft() {
    try {
      localStorage.setItem(LS_DRAFT, JSON.stringify({ at: Date.now(), shop: state.shop }));
    } catch (e) { /* quota */ }
  }

  function clearDraft() {
    try {
      localStorage.removeItem(LS_DRAFT);
    } catch (e) { /* ignore */ }
  }

  function catLabel(id) {
    const cat = state.shop.categories.find((item) => item.id === id);
    return cat ? cat.name : id;
  }

  function priceOf(product) {
    const prices = (product.skus || []).map((sku) => Number(sku.price)).filter((n) => !Number.isNaN(n));
    if (prices.length) return Math.min(...prices);
    return Number(product.price) || 0;
  }

  function hasRange(product) {
    const prices = (product.skus || []).map((sku) => Number(sku.price));
    return new Set(prices).size > 1;
  }

  /* List ------------------------------------------------------------------- */

  function visibleProducts() {
    const keyword = state.keyword.trim().toLowerCase();
    return state.shop.products.filter((product) => {
      if (state.cat !== "all" && product.cat !== state.cat) return false;
      if (!keyword) return true;
      return [product.name, product.sub, product.brand, product.brandSub, (product.tags || []).join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }

  function renderFilter() {
    const options = state.shop.categories
      .filter((cat) => cat.id !== "all")
      .map((cat) => `<option value="${esc(cat.id)}">${esc(cat.name)}</option>`)
      .join("");
    els.filter.innerHTML = `<option value="all">全部分类</option>${options}`;
    els.filter.value = state.cat;
  }

  function rowHtml(product) {
    const index = state.shop.products.indexOf(product);
    const price = priceOf(product);
    const invalid = price <= 0;
    const stock = product.stock || { level: "high", text: "" };
    const stockClass = stock.level === "out" ? "is-out" : stock.level === "low" ? "is-low" : "";
    const cover = product.cover
      ? `<img src="${esc(product.cover)}" alt="" loading="lazy" onerror="this.style.display='none'">`
      : esc(String(product.mark || product.brand || "?").slice(0, 2));
    const deleting = state.pendingDelete === product.id;

    return `
      <div class="arow${stock.level === "out" ? " is-off" : ""}" data-id="${esc(product.id)}">
        <div class="arow-main">
          <span class="thumb">${cover}</span>
          <div class="arow-name">
            <b>${esc(product.name || "未命名商品")}${invalid ? '<span class="warn-chip">缺价格</span>' : ""}</b>
            <span>${esc(product.sub || "")}</span>
          </div>
        </div>
        <div class="arow-cat">${esc(catLabel(product.cat))}</div>
        <div class="arow-price">¥${money(price)}${hasRange(product) ? " 起" : ""}</div>
        <div class="arow-stock ${stockClass}">${esc(stock.text || "—")}</div>
        <div class="arow-act">
          ${deleting
            ? `<button type="button" class="text-act danger" data-del-confirm="${index}">确认删除</button>
               <button type="button" class="text-act" data-del-cancel>取消</button>`
            : `<button type="button" class="text-act" data-edit="${index}">编辑</button>
               <button type="button" class="icon-act" data-move="${index}" data-dir="-1" title="上移">↑</button>
               <button type="button" class="icon-act" data-move="${index}" data-dir="1" title="下移">↓</button>
               <button type="button" class="text-act danger" data-del="${product.id}">删除</button>`}
        </div>
      </div>
    `;
  }

  function renderRows() {
    const items = visibleProducts();
    els.rows.innerHTML = items.map(rowHtml).join("");

    const total = state.shop.products.length;
    if (total === 0) {
      els.empty.hidden = false;
      els.empty.innerHTML = "<b>还没有商品</b><span>点右上角「新增商品」开始录入，保存后立即上线。</span>";
    } else if (items.length === 0) {
      els.empty.hidden = false;
      els.empty.innerHTML = "<b>没有匹配的商品</b><span>换个关键词或切换分类试试。</span>";
    } else {
      els.empty.hidden = true;
    }

    els.total.textContent = String(total);
    els.count.textContent = String(total);
  }

  function renderSettings() {
    $("[data-set='updated']").value = state.shop.updated || today();
    $("[data-set='qq']").value = (state.shop.contact && state.shop.contact.qq) || "";
    $("[data-set='hours']").value = (state.shop.contact && state.shop.contact.hours) || "";

    const notice = state.shop.notice || {};
    $("[data-set='noticeTitle']").value = notice.title || "";
    $("[data-set='noticeBody']").value = notice.body || "";
    $("[data-set='noticeEnabled']").checked = notice.enabled !== false;
  }

  function renderAll() {
    renderFilter();
    renderRows();
    renderSettings();
    renderUsers();
    renderCats();
  }

  function renderCats() {
    if (!els.catRows) return;
    const cats = state.shop.categories.filter((cat) => cat.id !== "all");

    els.catRows.innerHTML = cats.map((cat, index) => {
      const count = state.shop.products.filter((product) => product.cat === cat.id).length;
      const mark = cat.mark || CAT_MARK[cat.id] || (cat.name || "?").slice(0, 1);
      const pending = state.pendingCatDelete === cat.id;
      const actions = pending
        ? `<button type="button" class="text-act danger" data-cat-del-confirm="${cat.id}">确认删除</button>
           <button type="button" class="text-act" data-cat-del-cancel>取消</button>`
        : `<button type="button" class="text-act" data-cat-edit="${cat.id}">编辑</button>
           <button type="button" class="text-act danger" data-cat-del="${cat.id}">删除</button>`;

      return `
        <div class="catrow" data-cat-row="${esc(cat.id)}">
          <div class="cat-cell">
            <span class="cat-dot" style="background:${esc(catColor(cat, index + 1))}">${esc(mark)}</span>
            <b>${esc(cat.name)}</b>
          </div>
          <div>${esc(cat.en || "—")}</div>
          <div>${count} 款</div>
          <div class="catrow-act">${actions}</div>
        </div>`;
    }).join("");

    els.catsEmpty.hidden = cats.length > 0;
  }

  function resetCatForm() {
    state.catEditing = null;
    state.pendingCatDelete = null;
    els.catName.value = "";
    els.catEn.value = "";
    els.catMark.value = "";
    els.catSave.textContent = "添加分类";
    els.catCancel.hidden = true;
  }

  function saveCategory() {
    const name = els.catName.value.trim();
    const en = els.catEn.value.trim();
    const mark = els.catMark.value.trim();

    if (!name) {
      toast("请填写分类名称", true);
      els.catName.focus();
      return;
    }

    if (state.catEditing) {
      const cat = state.shop.categories.find((item) => item.id === state.catEditing);
      if (!cat) {
        resetCatForm();
        return;
      }
      cat.name = name;
      cat.en = en;
      if (mark) cat.mark = mark;
      toast("分类已更新，记得保存并发布");
    } else {
      const base = (en || name)
        .toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "") || "cat";
      let id = base.slice(0, 16);
      let n = 1;
      while (state.shop.categories.some((item) => item.id === id)) {
        n += 1;
        id = `${base.slice(0, 13)}${n}`;
      }
      state.shop.categories.push({
        id,
        name,
        en: en || name.toUpperCase(),
        mark: mark || name.slice(0, 1)
      });
      toast("分类已添加，记得保存并发布");
    }

    resetCatForm();
    markDirty();
    renderAll();
    renderRows();
  }

  async function renderUsers() {
    let users = [];
    let me = null;
    try {
      users = await Auth.list();
      me = await Auth.session();
    } catch (err) {
      els.userTotal.textContent = "—";
      els.usersEmpty.hidden = false;
      toast(err.message || "读取账号失败", true);
      return;
    }

    els.userRows.innerHTML = users.map((user) => {
      const isAdmin = user.role === "admin";
      const off = user.status === "disabled";
      const pending = state.pendingUserDelete === user.id;
      let actions;

      if (isAdmin) {
        actions = `<span class="urow-self">${me && me.uid === user.id ? "当前登录" : "受保护"}</span>`;
      } else if (pending) {
        actions = `<button type="button" class="text-act danger" data-user-del-confirm="${user.id}">确认删除</button>
          <button type="button" class="text-act" data-user-del-cancel>取消</button>`;
      } else {
        actions = `${off
          ? `<button type="button" class="text-act" data-user-enable="${user.id}">启用</button>`
          : `<button type="button" class="text-act" data-user-disable="${user.id}">停用</button>`}
          <button type="button" class="text-act danger" data-user-del="${user.id}">删除</button>`;
      }

      return `
        <div class="urow" data-uid="${esc(user.id)}">
          <div class="urow-name">${userAvatar(user)}<b>${esc(user.username)}</b>${isAdmin ? '<span class="badge">管理员</span>' : ""}</div>
          <div class="urow-nick">${esc(user.nickname || "—")}</div>
          <div class="urow-time">${esc(formatTime(user.createdAt))}</div>
          <div class="urow-status${off ? " is-off" : ""}">${off ? "已停用" : "正常"}</div>
          <div class="urow-act">${actions}</div>
        </div>`;
    }).join("");

    els.userTotal.textContent = String(users.length);
    els.usersEmpty.hidden = users.length > 0;
  }

  /* Editor ----------------------------------------------------------------- */

  function blankProduct() {
    const firstCat = state.shop.categories.find((cat) => cat.id !== "all");
    return {
      id: String(Date.now()).slice(-6),
      cat: firstCat ? firstCat.id : "gpt",
      brand: "",
      brandSub: "",
      mark: "",
      name: "",
      sub: "",
      price: 0,
      stock: { level: "high", text: "库存充足" },
      sold: 0,
      featured: state.shop.products.length + 1,
      tags: [],
      skuLabel: "商品规格",
      skus: [{ name: "默认规格", price: 0, hint: "" }],
      highlights: [],
      notes: [],
      cover: ""
    };
  }

  function openEditor(index) {
    state.editorIndex = index;
    state.editing = index >= 0 ? clone(state.shop.products[index]) : blankProduct();
    state.editing.tags = state.editing.tags || [];
    state.editing.skus = state.editing.skus && state.editing.skus.length
      ? state.editing.skus
      : [{ name: "默认规格", price: state.editing.price || 0, hint: "" }];

    const p = state.editing;
    els.editorTitle.textContent = index >= 0 ? "编辑商品" : "新增商品";
    $("[data-f='name']").value = p.name || "";
    $("[data-f='sub']").value = p.sub || "";
    $("[data-f='cat']").innerHTML = state.shop.categories
      .filter((cat) => cat.id !== "all")
      .map((cat) => `<option value="${esc(cat.id)}">${esc(cat.name)}</option>`)
      .join("");
    $("[data-f='cat']").value = p.cat || "gpt";
    $("[data-f='mark']").value = p.mark || "";
    $("[data-f='brand']").value = p.brand || "";
    $("[data-f='brandSub']").value = p.brandSub || "";
    $("[data-f='cover']").value = p.cover || "";
    $("[data-f='price']").value = p.price != null ? p.price : 0;
    $("[data-f='stockLevel']").value = (p.stock && p.stock.level) || "high";
    $("[data-f='stockText']").value = (p.stock && p.stock.text) || "库存充足";
    $("[data-f='sold']").value = p.sold || 0;
    $("[data-f='tags']").value = (p.tags || []).join(", ");
    $("[data-f='highlights']").value = (p.highlights || []).join("\n");
    $("[data-f='notes']").value = (p.notes || []).join("\n");
    renderSkus();
    updateCover();

    els.editor.hidden = false;
    els.scrim.hidden = false;
    $("[data-f='name']").focus();
  }

  function closeEditor() {
    els.editor.hidden = true;
    if (els.auth.hidden) els.scrim.hidden = true;
    state.editing = null;
  }

  function renderSkus() {
    const skus = state.editing.skus;
    els.skus.innerHTML = skus.map((sku, i) => `
      <div class="sku-row" data-sku="${i}">
        <input type="text" value="${esc(sku.name || "")}" placeholder="规格名称" data-sku-field="name">
        <input type="number" step="0.01" min="0" value="${sku.price != null ? sku.price : 0}" placeholder="价格" data-sku-field="price">
        <input type="text" value="${esc(sku.hint || "")}" placeholder="说明（可选）" data-sku-field="hint">
        <button type="button" class="icon-act danger" data-sku-remove="${i}" title="删除规格">✕</button>
      </div>
    `).join("");
  }

  function updateCover() {
    const src = $("[data-f='cover']").value.trim();
    if (src) {
      els.coverPreview.src = src;
      els.coverPreview.hidden = false;
      els.coverEmpty.hidden = true;
    } else {
      els.coverPreview.hidden = true;
      els.coverPreview.removeAttribute("src");
      els.coverEmpty.hidden = false;
    }
  }

  async function uploadCover(file) {
    if (!state.token) {
      openAuth();
      toast("先连接 GitHub 才能上传图片", true);
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast("图片请控制在 2MB 以内", true);
      return;
    }

    const ext = (file.name.split(".").pop() || "").toLowerCase().replace("jpeg", "jpg");
    if (!["png", "jpg", "webp"].includes(ext)) {
      toast("只支持 PNG / JPG / WEBP", true);
      return;
    }

    const base = state.editing && state.editing.id ? state.editing.id : "cover";
    const target = `assets/img/products/${base}-${Date.now().toString(36)}.${ext}`;

    els.uploadCover.disabled = true;
    els.uploadCover.textContent = "上传中…";
    try {
      const buffer = new Uint8Array(await file.arrayBuffer());
      let bin = "";
      const chunk = 0x8000;
      for (let i = 0; i < buffer.length; i += chunk) {
        bin += String.fromCharCode.apply(null, buffer.subarray(i, i + chunk));
      }
      await gh(`/repos/${OWNER}/${REPO}/contents/${target}`, {
        method: "PUT",
        body: JSON.stringify({
          message: `Upload cover ${target}`,
          content: btoa(bin),
          branch: BRANCH
        })
      });
      $("[data-f='cover']").value = target;
      if (state.editing) state.editing.cover = target;
      updateCover();
      toast("图片已上传，保存商品后生效");
    } catch (err) {
      const message = err.status === 403
        ? "令牌没有写入权限（403）"
        : err.status === 401
          ? "令牌失效（401）"
          : err.message;
      toast(`上传失败：${message}`, true);
    } finally {
      els.uploadCover.disabled = false;
      els.uploadCover.textContent = "上传图片";
    }
  }

  function collectSkus() {
    return $$(".sku-row", els.skus).map((row) => ({
      name: $("[data-sku-field='name']", row).value.trim(),
      price: Number($("[data-sku-field='price']", row).value) || 0,
      hint: $("[data-sku-field='hint']", row).value.trim()
    }));
  }

  function commitEditor() {
    const p = state.editing;
    p.name = $("[data-f='name']").value.trim();
    p.sub = $("[data-f='sub']").value.trim();
    p.cat = $("[data-f='cat']").value;
    p.mark = $("[data-f='mark']").value.trim();
    p.brand = $("[data-f='brand']").value.trim();
    p.brandSub = $("[data-f='brandSub']").value.trim();
    p.cover = $("[data-f='cover']").value.trim();
    p.price = Number($("[data-f='price']").value) || 0;
    p.stock = {
      level: $("[data-f='stockLevel']").value,
      text: $("[data-f='stockText']").value.trim() || "库存充足"
    };
    p.sold = Number($("[data-f='sold']").value) || 0;
    p.tags = $("[data-f='tags']").value.split(/[,，]/).map((t) => t.trim()).filter(Boolean);
    p.highlights = $("[data-f='highlights']").value.split("\n").map((t) => t.trim()).filter(Boolean);
    p.notes = $("[data-f='notes']").value.split("\n").map((t) => t.trim()).filter(Boolean);
    p.skus = collectSkus().filter((sku) => sku.name);

    if (!p.name) {
      toast("请填写商品名称", true);
      $("[data-f='name']").focus();
      return;
    }
    if (!p.skus.length) {
      toast("至少需要一个规格", true);
      return;
    }
    const validPrices = p.skus
      .map((sku) => Number(sku.price))
      .filter((n) => Number.isFinite(n) && n > 0);

    if (!Number.isFinite(p.price) || p.price <= 0) {
      p.price = validPrices.length ? Math.min(...validPrices) : 0;
    }

    if (!Number.isFinite(p.price) || p.price <= 0) {
      toast("请填写有效价格（必须大于 0）", true);
      $("[data-f='price']").focus();
      return;
    }

    p.skus = p.skus.map((sku) => ({
      ...sku,
      price: Number.isFinite(Number(sku.price)) && Number(sku.price) > 0
        ? Number(sku.price)
        : p.price
    }));

    if (state.editorIndex >= 0) {
      state.shop.products[state.editorIndex] = p;
    } else {
      p.featured = p.featured || state.shop.products.length + 1;
      state.shop.products.push(p);
    }

    renumber();
    markDirty();
    renderRows();
    closeEditor();
    toast("已更新，记得点「保存并发布」");
  }

  function renumber() {
    state.shop.products.forEach((product, index) => {
      product.featured = index + 1;
    });
  }

  /* Auth ------------------------------------------------------------------- */

  function openAuth() {
    els.authErr.hidden = true;
    els.token.value = state.token || "";
    els.auth.hidden = false;
    els.scrim.hidden = false;
    els.token.focus();
  }

  function closeAuth() {
    els.auth.hidden = true;
    if (els.editor.hidden) els.scrim.hidden = true;
  }

  async function submitAuth() {
    const value = els.token.value.trim();
    if (!value) {
      showAuthError("请粘贴 token");
      return;
    }
    const button = $("[data-auth-ok]");
    button.disabled = true;
    button.textContent = "验证中…";
    try {
      const login = await verifyToken(value);
      if (els.remember.checked) {
        localStorage.setItem(LS_TOKEN, value);
      } else {
        localStorage.removeItem(LS_TOKEN);
      }
      closeAuth();
      toast(`已连接 @${login}，可以发布了`);
      await reloadFromRepo();
    } catch (err) {
      const message = err.status === 401
        ? "令牌无效或已过期（401）"
        : err.status === 403
          ? "令牌权限不足（403）"
          : err.message || "连接失败";
      showAuthError(message);
      state.token = "";
      setConnected(null);
    } finally {
      button.disabled = false;
      button.textContent = "连接";
    }
  }

  function showAuthError(message) {
    els.authErr.textContent = message;
    els.authErr.hidden = false;
  }

  /* Publish ---------------------------------------------------------------- */

  async function publish() {
    if (state.busy) return;
    if (!state.token) {
      openAuth();
      toast("先连接 GitHub 才能发布", true);
      return;
    }
    if (state.dataSource !== "repo") {
      toast("请先点「连接」读取仓库里的最新数据，再发布", true);
      return;
    }
    if (!state.dirty) {
      toast("没有需要保存的修改");
      return;
    }

    state.busy = true;
    els.save.disabled = true;
    els.save.textContent = "发布中…";
    els.build.textContent = "正在提交…";

    try {
      if (!state.shop.updated) state.shop.updated = today();
      const content = serializeShop(state.shop);
      const sha = state.fileSha || await fileSha();
      const body = {
        message: `Update catalog (${state.shop.products.length} products) via admin console`,
        content: b64(content),
        branch: BRANCH
      };
      if (sha) body.sha = sha;

      const res = await gh(`/repos/${OWNER}/${REPO}/contents/${DATA_PATH}`, {
        method: "PUT",
        body: JSON.stringify(body)
      });

      state.dirty = false;
      state.fileSha = res.content && res.content.sha ? res.content.sha : state.fileSha;
      state.lastCommit = res.commit ? res.commit.sha : null;
      state.remoteJson = JSON.stringify(state.shop);
      clearDraft();
      els.banner.hidden = true;
      toast(`已发布 · ${res.commit.sha.slice(0, 7)}`);
      if (window.Auth && Auth.pushShopData) {
        Auth.pushShopData(content).catch(() => {});
      }
      renderSettings();
      pollBuild();
    } catch (err) {
      const message = err.status === 409
        ? "文件已在别处更新，刷新页面后重试（409）"
        : err.status === 401
          ? "令牌失效，请重新连接（401）"
          : err.status === 403
            ? "令牌没有写入权限（403）：请确认令牌对该仓库的 Contents 权限是 Read and write"
          : `发布失败：${err.message}`;
      toast(message, true);
      els.build.textContent = "提交失败";
    } finally {
      state.busy = false;
      els.save.disabled = false;
      els.save.textContent = "保存并发布";
    }
  }

  async function pollBuild() {
    const target = state.lastCommit;
    if (els.retryBuild) els.retryBuild.hidden = true;

    for (let i = 0; i < 25; i += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 4000));
      try {
        const builds = await gh(`/repos/${OWNER}/${REPO}/pages/builds?per_page=8`);
        const build = target
          ? builds.find((item) => item.commit === target)
          : builds[0];

        if (!build) {
          els.build.textContent = "等待构建排队…";
          continue;
        }

        if (build.status === "built") {
          els.build.textContent = `构建完成 · ${new Date(build.updated_at).toLocaleTimeString("zh-CN", { hour12: false })}`;
          if (els.retryBuild) els.retryBuild.hidden = true;
          toast("站点已更新，刷新首页即可看到");
          return;
        }
        if (build.status === "errored") {
          els.build.textContent = "构建失败（短时间内多次发布会限流）";
          if (els.retryBuild) els.retryBuild.hidden = false;
          toast("Pages 构建失败，可点「重试构建」；短时间内多次发布会触发频率限制", true);
          return;
        }
        els.build.textContent = `GitHub Pages 构建中…（${build.status}）`;
      } catch (err) {
        els.build.textContent = "构建状态未知";
        return;
      }
    }
    els.build.textContent = "构建超时，稍后刷新页面查看";
  }

  /* Events ----------------------------------------------------------------- */

  function bind() {
    els.openAuth.addEventListener("click", openAuth);
    $("[data-auth-cancel]").addEventListener("click", closeAuth);
    $("[data-auth-ok]").addEventListener("click", submitAuth);
    els.token.addEventListener("keydown", (event) => {
      if (event.key === "Enter") submitAuth();
    });

    els.save.addEventListener("click", publish);

    els.newBtn.addEventListener("click", () => openEditor(-1));
    $("[data-editor-close]").addEventListener("click", closeEditor);
    $$("[data-editor-close]").forEach((button) => button.addEventListener("click", closeEditor));
    $("[data-editor-ok]").addEventListener("click", commitEditor);

    els.search.addEventListener("input", () => {
      state.keyword = els.search.value;
      renderRows();
    });

    els.filter.addEventListener("change", () => {
      state.cat = els.filter.value;
      renderRows();
    });

    els.rows.addEventListener("click", (event) => {
      const edit = event.target.closest("[data-edit]");
      if (edit) {
        openEditor(Number(edit.dataset.edit));
        return;
      }

      const move = event.target.closest("[data-move]");
      if (move) {
        const from = Number(move.dataset.move);
        const to = from + Number(move.dataset.dir);
        if (to < 0 || to >= state.shop.products.length) return;
        const list = state.shop.products;
        const [item] = list.splice(from, 1);
        list.splice(to, 0, item);
        renumber();
        markDirty();
        renderRows();
        return;
      }

      const del = event.target.closest("[data-del]");
      if (del) {
        state.pendingDelete = del.dataset.del;
        renderRows();
        return;
      }

      const confirmDel = event.target.closest("[data-del-confirm]");
      if (confirmDel) {
        state.shop.products.splice(Number(confirmDel.dataset.delConfirm), 1);
        state.pendingDelete = null;
        renumber();
        markDirty();
        renderRows();
        toast("已删除，记得点「保存并发布」");
        return;
      }

      if (event.target.closest("[data-del-cancel]")) {
        state.pendingDelete = null;
        renderRows();
      }
    });

    $("[data-add-sku]").addEventListener("click", () => {
      state.editing.skus.push({ name: "", price: state.editing.price || 0, hint: "" });
      renderSkus();
    });

    els.skus.addEventListener("click", (event) => {
      const remove = event.target.closest("[data-sku-remove]");
      if (!remove) return;
      if (state.editing.skus.length === 1) {
        toast("至少保留一个规格", true);
        return;
      }
      state.editing.skus.splice(Number(remove.dataset.skuRemove), 1);
      renderSkus();
    });

    $("[data-f='cover']").addEventListener("input", updateCover);

    els.uploadCover.addEventListener("click", () => {
      if (!state.token) {
        openAuth();
        toast("先连接 GitHub 才能上传图片", true);
        return;
      }
      els.coverFile.click();
    });

    els.coverFile.addEventListener("change", () => {
      const file = els.coverFile.files && els.coverFile.files[0];
      if (file) uploadCover(file);
      els.coverFile.value = "";
    });

    $$("[data-set]").forEach((input) => {
      input.addEventListener("change", () => {
        const key = input.dataset.set;
        if (key === "updated") {
          state.shop.updated = input.value;
        } else if (key === "noticeTitle") {
          state.shop.notice.title = input.value.trim();
        } else if (key === "noticeBody") {
          state.shop.notice.body = input.value;
        } else if (key === "noticeEnabled") {
          state.shop.notice.enabled = input.checked;
        } else {
          state.shop.contact[key] = input.value.trim();
        }
        markDirty();
      });
    });

    $$("[data-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        $$("[data-tab]").forEach((item) => item.classList.toggle("is-active", item === button));
        $$("[data-view]").forEach((view) => {
          view.hidden = view.dataset.view !== button.dataset.tab;
        });
      });
    });

    els.exportBtn.addEventListener("click", (event) => {
      event.preventDefault();
      // 导出为 .json：浏览器会拦截 .js 下载并卡在“未确认”状态
      const blob = new Blob([JSON.stringify(state.shop, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `shop-${today()}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    });

    $("[data-draft-restore]").addEventListener("click", restoreDraft);
    $("[data-draft-drop]").addEventListener("click", () => {
      clearDraft();
      els.banner.hidden = true;
    });

    els.scrim.addEventListener("click", () => {
      if (!els.auth.hidden) return;
      closeEditor();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (!els.auth.hidden) closeAuth();
      else if (!els.editor.hidden) closeEditor();
    });

    els.gateForm.addEventListener("submit", submitGate);

    $("[data-logout]").addEventListener("click", async () => {
      await Auth.logout();
      window.location.reload();
    });

    $("[data-refresh-users]").addEventListener("click", async () => {
      await renderUsers();
      toast("会员列表已刷新");
    });

    $("[data-backup-users]").addEventListener("click", async () => {
      try {
        const data = await Auth.backupAccounts();
        if (!data) {
          toast("账号备份只在「本机文件」模式下可用（先启动本地服务）", true);
          return;
        }
        const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `accounts-backup-${stamp}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1500);
        toast("账号备份已导出");
      } catch (err) {
        toast(`导出失败：${err.message}`, true);
      }
    });

    if (els.retryBuild) {
      els.retryBuild.addEventListener("click", async () => {
        if (!state.token) {
          openAuth();
          return;
        }
        els.retryBuild.disabled = true;
        els.retryBuild.textContent = "触发中…";
        try {
          await gh(`/repos/${OWNER}/${REPO}/pages/builds`, { method: "POST", body: "{}" });
          els.build.textContent = "已请求重新构建…";
          els.retryBuild.hidden = true;
          pollBuild();
        } catch (err) {
          toast(`重试失败：${err.message}`, true);
        } finally {
          els.retryBuild.disabled = false;
          els.retryBuild.textContent = "重试构建";
        }
      });
    }

    if (els.catSave) {
      els.catSave.addEventListener("click", saveCategory);
      els.catCancel.addEventListener("click", () => {
        resetCatForm();
        renderCats();
      });

      els.catRows.addEventListener("click", (event) => {
        const edit = event.target.closest("[data-cat-edit]");
        const del = event.target.closest("[data-cat-del]");
        const confirmDel = event.target.closest("[data-cat-del-confirm]");

        if (edit) {
          const cat = state.shop.categories.find((item) => item.id === edit.dataset.catEdit);
          if (!cat) return;
          state.catEditing = cat.id;
          els.catName.value = cat.name || "";
          els.catEn.value = cat.en || "";
          els.catMark.value = cat.mark || "";
          els.catSave.textContent = "保存修改";
          els.catCancel.hidden = false;
          els.catName.focus();
          return;
        }

        if (del) {
          const id = del.dataset.catDel;
          const count = state.shop.products.filter((product) => product.cat === id).length;
          if (count > 0) {
            toast(`该分类下还有 ${count} 个商品，请先把它们改到其他分类`, true);
            return;
          }
          state.pendingCatDelete = id;
          renderCats();
          return;
        }

        if (confirmDel) {
          const id = confirmDel.dataset.catDelConfirm;
          state.shop.categories = state.shop.categories.filter((item) => item.id !== id);
          if (state.cat === id) state.cat = "all";
          state.pendingCatDelete = null;
          markDirty();
          renderAll();
          renderRows();
          toast("分类已删除，记得保存并发布");
          return;
        }

        if (event.target.closest("[data-cat-del-cancel]")) {
          state.pendingCatDelete = null;
          renderCats();
        }
      });
    }

    els.userRows.addEventListener("click", async (event) => {
      const disable = event.target.closest("[data-user-disable]");
      const enable = event.target.closest("[data-user-enable]");
      const remove = event.target.closest("[data-user-del]");
      const confirmRemove = event.target.closest("[data-user-del-confirm]");

      try {
        if (disable) {
          await Auth.setStatus(disable.dataset.userDisable, "disabled");
          await renderUsers();
          toast("账号已停用");
          return;
        }
        if (enable) {
          await Auth.setStatus(enable.dataset.userEnable, "active");
          await renderUsers();
          toast("账号已启用");
          return;
        }
        if (remove) {
          state.pendingUserDelete = remove.dataset.userDel;
          renderUsers();
          return;
        }
        if (confirmRemove) {
          await Auth.remove(confirmRemove.dataset.userDelConfirm);
          state.pendingUserDelete = null;
          await renderUsers();
          toast("账号已删除");
          return;
        }
        if (event.target.closest("[data-user-del-cancel]")) {
          state.pendingUserDelete = null;
          renderUsers();
        }
      } catch (err) {
        toast(err.message || "操作失败", true);
      }
    });
  }

  function restoreDraft() {
    try {
      const raw = localStorage.getItem(LS_DRAFT);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (!draft || !draft.shop) return;
      state.shop = draft.shop;
      state.dirty = true;
      els.banner.hidden = true;
      renderAll();
      toast("已恢复草稿，确认后点「保存并发布」");
    } catch (e) {
      toast("草稿损坏，无法恢复", true);
    }
  }

  function checkDraft() {
    let raw = null;
    try {
      raw = localStorage.getItem(LS_DRAFT);
    } catch (e) {
      return;
    }
    if (!raw) return;
    try {
      const draft = JSON.parse(raw);
      if (!draft || !draft.shop) return;
      if (JSON.stringify(draft.shop) === state.remoteJson) {
        clearDraft();
        return;
      }
      els.bannerTime.textContent = new Date(draft.at).toLocaleString("zh-CN", { hour12: false });
      els.banner.hidden = false;
    } catch (e) {
      clearDraft();
    }
  }

  /* Boot ------------------------------------------------------------------- */

  let started = false;

  function showGate() {
    els.app.hidden = true;
    els.gate.hidden = false;
    els.gateTitle.textContent = "管理员登录";
    els.gateSub.textContent = "仅限店主账号进入";
    els.gateConfirm.hidden = true;
    els.gateSubmit.textContent = "进入后台";
    els.gateHint.textContent = "此处仅限店主本人使用。";
    els.gateForm.reset();
    els.gateErr.hidden = true;
    $("[name='username']", els.gateForm).focus();
  }

  function gateError(message) {
    els.gateErr.textContent = message;
    els.gateErr.hidden = false;
  }

  async function submitGate(event) {
    event.preventDefault();
    els.gateErr.hidden = true;

    const data = new FormData(els.gateForm);
    const username = String(data.get("username") || "").trim();
    const password = String(data.get("password") || "");

    if (!username || !password) {
      gateError("请填写账号和密码");
      return;
    }

    els.gateSubmit.disabled = true;
    try {
      const session = await Auth.login(username, password, true);

      if (!(await Auth.isOwner(session))) {
        await Auth.logout();
        throw new Error("该账号没有后台权限");
      }
      startConsole(session);
    } catch (err) {
      gateError(err.message || "登录失败");
    } finally {
      els.gateSubmit.disabled = false;
    }
  }

  async function startConsole(session) {
    els.gate.hidden = true;
    els.app.hidden = false;

    const info = await Auth.info();
    const source = $("[data-users-source]");
    if (source && info && info.accountsFile) {
      source.textContent = `账号数据：${info.accountsFile}`;
    }
    if (els.modeChip) {
      if (info && info.accountsFile) {
        els.modeChip.textContent = "本机文件";
        els.modeChip.title = info.accountsFile;
        els.modeChip.classList.add("is-file");
      } else {
        els.modeChip.textContent = "浏览器存储";
        els.modeChip.title = "当前页面没有连接本地账号服务，账号数据存在浏览器中";
        els.modeChip.classList.remove("is-file");
      }
      els.modeChip.hidden = false;
    }

    if (els.adminName) {
      els.adminName.textContent = session.nickname || session.username;
      els.adminName.hidden = false;
    }

    if (started) {
      renderUsers();
      return;
    }
    started = true;

    // 先用已保存的令牌连上，再读数据：
    // 否则会先展示本地旧数据，此时发布可能覆盖线上内容
    let saved = null;
    try {
      saved = localStorage.getItem(LS_TOKEN);
    } catch (e) { /* ignore */ }
    if (saved) {
      try {
        await verifyToken(saved);
      } catch (err) {
        state.token = "";
        setConnected(null);
        try {
          localStorage.removeItem(LS_TOKEN);
        } catch (e) { /* ignore */ }
      }
    }

    try {
      await loadData();
    } catch (err) {
      toast(`读取数据失败：${err.message}`, true);
      return;
    }
    renderAll();
    checkDraft();
  }

  async function boot() {
    bind();
    const session = await Auth.session();
    if (!session || !(await Auth.isOwner(session))) {
      showGate();
      return;
    }
    await startConsole(session);
  }

  boot();
})();
