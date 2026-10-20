(function () {
  "use strict";

  const $ = (selector, scope = document) => scope.querySelector(selector);

  const els = {
    guest: $("[data-guest]"),
    profile: $("[data-profile]"),
    form: $("[data-form]"),
    err: $("[data-err]"),
    submit: $("[data-submit]"),
    switchText: $("[data-switch-text]"),
    switchBtn: $("[data-switch]"),
    remember: $("[name='remember']"),
    logout: $("[data-logout]"),
    name: $("[data-profile-name]"),
    user: $("[data-profile-user]"),
    role: $("[data-profile-role]"),
    perm: $("[data-profile-perm]"),
    adminLink: $("[data-goto-admin]"),
    hint: $("[data-acc-hint]"),
    orders: $("[data-orders]"),
    orderList: $("[data-order-list]"),
    orderCount: $("[data-order-count]"),
    avatarBox: $("[data-avatar]"),
    avatarImg: $("[data-avatar-img]"),
    avatarInitial: $("[data-avatar-initial]"),
    avatarUpload: $("[data-avatar-upload]"),
    avatarRemove: $("[data-avatar-remove]"),
    avatarFile: $("[data-avatar-file]"),
    time: $("[data-profile-time]")
  };

  const ORDER_KEY = "xiaoyang_shop_orders_v1";

  const esc = (value) => String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  const AVATAR_COLORS = ["#111418", "#d97757", "#23262c", "#3d6b8f", "#6b4f9e", "#2f6b4f", "#a8722a"];

  function avatarInitial(user) {
    const name = String(user.nickname || user.username || "?").trim();
    return name.slice(0, 1).toUpperCase();
  }

  function avatarColor(name) {
    const text = String(name || "");
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
    return AVATAR_COLORS[hash % AVATAR_COLORS.length];
  }

  function renderAvatar(session) {
    if (!els.avatarBox) return;
    if (session.avatar) {
      els.avatarImg.src = session.avatar;
      els.avatarImg.hidden = false;
      els.avatarInitial.hidden = true;
      els.avatarBox.style.background = "transparent";
    } else {
      els.avatarImg.hidden = true;
      els.avatarImg.removeAttribute("src");
      els.avatarInitial.hidden = false;
      els.avatarInitial.textContent = avatarInitial(session);
      els.avatarBox.style.background = avatarColor(session.username);
    }
    els.avatarRemove.hidden = !session.avatar;
  }

  /** 把选中的图片裁成 128×128 方形，避免头像过大 */
  function fileToAvatar(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("读取图片失败"));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("图片格式不支持"));
        img.onload = () => {
          const size = 128;
          const canvas = document.createElement("canvas");
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");
          const side = Math.min(img.width, img.height) || size;
          ctx.drawImage(
            img,
            (img.width - side) / 2,
            (img.height - side) / 2,
            side,
            side,
            0,
            0,
            size,
            size
          );
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function renderOrders() {
    let list = [];
    try {
      list = JSON.parse(localStorage.getItem(ORDER_KEY) || "[]");
    } catch (e) {
      list = [];
    }
    if (!els.orders || !Array.isArray(list) || !list.length) {
      if (els.orders) els.orders.hidden = true;
      return;
    }

    els.orderList.innerHTML = list.slice(0, 6).map((order) => {
      const items = Array.isArray(order.items) ? order.items : [];
      const names = items.map((item) => `${esc(item.name)} × ${Number(item.qty) || 1}`).join("、");
      const when = order.createdAt ? new Date(order.createdAt) : null;
      const time = when && !Number.isNaN(when.getTime())
        ? when.toLocaleString("zh-CN", { hour12: false })
        : "—";
      return `
        <div class="acc-order">
          <div class="acc-order-main">
            <b>${esc(order.no || "—")}</b>
            <span>${names || "—"}</span>
          </div>
          <div class="acc-order-side">
            <strong>¥${esc(order.total)}</strong>
            <small>${esc(time)}</small>
          </div>
        </div>`;
    }).join("");

    els.orderCount.textContent = String(list.length);
    els.orders.hidden = false;
  }

  let mode = "login";

  function setMode(next) {
    mode = next;
    document.querySelectorAll("[data-mode]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.mode === next);
    });
    document.querySelectorAll("[data-only-register]").forEach((el) => {
      el.hidden = next !== "register";
    });
    document.querySelectorAll("[data-only-login]").forEach((el) => {
      el.hidden = next !== "login";
    });
    els.submit.textContent = next === "login" ? "登录" : "注册";
    els.switchText.textContent = next === "login" ? "还没有账号？" : "已经有账号？";
    els.switchBtn.textContent = next === "login" ? "立即注册" : "去登录";
    els.err.hidden = true;

    const password = $("[name='password']");
    password.autocomplete = next === "login" ? "current-password" : "new-password";
  }

  function fail(message) {
    els.err.textContent = message;
    els.err.hidden = false;
  }

  function formatTime(iso) {
    if (!iso) return "—";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString("zh-CN", { hour12: false });
  }

  async function render() {
    const session = await Auth.session();
    if (session) {
      els.guest.hidden = true;
      els.profile.hidden = false;
      els.name.textContent = session.nickname || session.username;
      els.user.textContent = session.username;
      els.role.textContent = session.role === "admin" ? "管理员" : "普通会员";
      els.perm.textContent = session.role === "admin"
        ? "全站管理"
        : "浏览商品 / 下单购买";
      if (els.adminLink) els.adminLink.hidden = !(await Auth.isOwner(session));

      els.time.textContent = formatTime(session.createdAt);
      renderAvatar(session);
      renderOrders();
      return;
    }

    els.guest.hidden = false;
    els.profile.hidden = true;
    if (els.orders) els.orders.hidden = true;
  }

  function submit(event) {
    event.preventDefault();
    els.err.hidden = true;

    const data = new FormData(els.form);
    const username = String(data.get("username") || "").trim();
    const password = String(data.get("password") || "");
    const nickname = String(data.get("nickname") || "").trim();
    const confirm = String(data.get("confirm") || "");

    if (!username) return fail("请填写账号");
    if (!password) return fail("请填写密码");

    if (mode === "register") {
      if (password !== confirm) return fail("两次输入的密码不一致");
    }

    els.submit.disabled = true;
    const label = els.submit.textContent;
    els.submit.textContent = mode === "login" ? "登录中…" : "注册中…";

    // 让浏览器先把按钮状态画出来，再做派生计算
    window.setTimeout(async () => {
      try {
        if (mode === "login") {
          await Auth.login(username, password, els.remember.checked);
        } else {
          await Auth.register({ username, password, nickname });
        }
        els.form.reset();
        await render();
      } catch (err) {
        fail(err.message || "操作失败");
      } finally {
        els.submit.disabled = false;
        els.submit.textContent = label;
      }
    }, 30);
  }

  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => setMode(button.dataset.mode));
  });

  els.switchBtn.addEventListener("click", () => {
    setMode(mode === "login" ? "register" : "login");
  });

  els.form.addEventListener("submit", submit);

  els.logout.addEventListener("click", async () => {
    await Auth.logout();
    setMode("login");
    await render();
  });

  if (els.avatarUpload) {
    els.avatarUpload.addEventListener("click", () => els.avatarFile.click());

    els.avatarFile.addEventListener("change", async () => {
      const file = els.avatarFile.files && els.avatarFile.files[0];
      els.avatarFile.value = "";
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
        fail("图片请控制在 5MB 以内");
        return;
      }

      try {
        const dataUrl = await fileToAvatar(file);
        await Auth.setAvatar(dataUrl);
        await render();
      } catch (err) {
        fail(err.message || "头像更新失败");
      }
    });

    els.avatarRemove.addEventListener("click", async () => {
      try {
        await Auth.setAvatar("");
        await render();
      } catch (err) {
        fail(err.message || "头像移除失败");
      }
    });
  }

  const query = new URLSearchParams(window.location.search);
  setMode(query.get("mode") === "register" ? "register" : "login");
  render();

  (async () => {
    const info = await Auth.info();
    if (els.hint && info && info.accountsFile) {
      els.hint.textContent = `账号数据保存在本机文件：${info.accountsFile}`;
    }
  })();
})();
