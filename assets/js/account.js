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
    time: $("[data-profile-time]")
  };

  const ORDER_KEY = "xiaoyang_shop_orders_v1";

  const esc = (value) => String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

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

  setMode("login");
  render();

  (async () => {
    const info = await Auth.info();
    if (els.hint && info && info.accountsFile) {
      els.hint.textContent = `账号数据保存在本机文件：${info.accountsFile}`;
    }
  })();
})();
