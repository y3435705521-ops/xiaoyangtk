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
    time: $("[data-profile-time]")
  };

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

  function render() {
    const session = Auth.session();
    if (session) {
      els.guest.hidden = true;
      els.profile.hidden = false;
      els.name.textContent = session.nickname || session.username;
      els.user.textContent = session.username;
      els.role.textContent = session.role === "admin" ? "管理员" : "普通会员";
      els.perm.textContent = session.role === "admin"
        ? "全站管理"
        : "浏览商品 / 下单购买";

      const users = Auth.list();
      const me = users.find((user) => user.id === session.uid);
      els.time.textContent = me ? formatTime(me.createdAt) : "—";
      return;
    }

    els.guest.hidden = false;
    els.profile.hidden = true;
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
    window.setTimeout(() => {
      try {
        if (mode === "login") {
          Auth.login(username, password, els.remember.checked);
        } else {
          Auth.register({ username, password, nickname });
        }
        els.form.reset();
        render();
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

  els.logout.addEventListener("click", () => {
    Auth.logout();
    setMode("login");
    render();
  });

  setMode("login");
  render();
})();
