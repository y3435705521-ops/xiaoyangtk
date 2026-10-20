(function () {
  "use strict";

  const SHOP = window.SHOP;

  if (!SHOP || !Array.isArray(SHOP.products)) {
    const grid = document.querySelector("[data-product-grid]");
    if (grid) {
      grid.innerHTML = '<div class="table-empty"><p class="table-empty-title">商品数据加载失败</p><p class="table-empty-sub">请刷新页面重试，仍有问题请联系客服。</p></div>';
    }
    const stat = document.querySelector("[data-stat-count]");
    if (stat) stat.textContent = "0";
    return;
  }

  const CART_KEY = "xiaoyang_shop_cart_v1";
  const LAST_ORDER_KEY = "xiaoyang_shop_last_order_v1";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  const els = {
    grid: $("[data-product-grid]"),
    tabs: $("[data-tabs]"),
    search: $("[data-search]"),
    searchClear: $("[data-search-clear]"),
    sort: $("[data-sort]"),
    resultText: $("[data-result-text]"),
    empty: $("[data-empty]"),
    catalogEmpty: $("[data-catalog-empty]"),
    catTitle: $("[data-cat-title]"),
    catCount: $("[data-cat-count]"),
    reset: $("[data-reset-filter]"),
    cartDrawer: $("[data-cart-drawer]"),
    cartList: $("[data-cart-list]"),
    cartEmpty: $("[data-cart-empty]"),
    cartFoot: $("[data-cart-foot]"),
    cartTotal: $("[data-cart-total]"),
    cartCounts: $$("[data-cart-count]"),
    drawerCount: $("[data-drawer-count]"),
    scrim: $("[data-scrim]"),
    checkoutBtn: $("[data-checkout]"),
    checkoutForm: $("[data-checkout-form]"),
    checkoutSummary: $("[data-checkout-summary]"),
    formError: $("[data-form-error]"),
    orderNo: $("[data-order-no]"),
    orderTotal: $("[data-order-total]"),
    productModal: $("[data-product-modal]"),
    modalMedia: $("[data-modal-media]"),
    modalContent: $("[data-modal-content]"),
    toast: $("[data-toast]"),
    mobileMenu: $("[data-mobile-menu]"),
    menuToggle: $("[data-menu-toggle]"),
    header: $(".site-header")
  };

  const state = {
    category: "all",
    search: "",
    sort: "featured",
    cart: loadCart(),
    modalProductId: null,
    modalSku: 0,
    modalQty: 1,
    lastFocus: null,
    toastTimer: null,
    lastOrder: null
  };

  const CAT_MARK = { all: "全", gpt: "G", claude: "C", grok: "X" };
  const STOCK_CLASS = { high: "", mid: "is-mid", low: "is-low", out: "is-out" };

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));
  }

  function money(value) {
    return Number(value).toLocaleString("zh-CN", { maximumFractionDigits: 2 });
  }

  function soldText(value) {
    if (value >= 10000) return `${(value / 10000).toFixed(1).replace(/\.0$/, "")}万`;
    return Number(value).toLocaleString("zh-CN");
  }

  function productById(id) {
    return SHOP.products.find((product) => product.id === String(id));
  }

  function skuOf(product, index) {
    return product.skus[index] || product.skus[0];
  }

  function priceRange(product) {
    const prices = (product.skus || [])
      .map((sku) => Number(sku.price))
      .filter((n) => Number.isFinite(n) && n > 0);

    if (prices.length) {
      return { min: Math.min(...prices), max: Math.max(...prices) };
    }

    const fallback = Number(product.price);
    if (Number.isFinite(fallback) && fallback > 0) {
      return { min: fallback, max: fallback };
    }
    return { min: 0, max: 0 };
  }

  /** 没有有效价格的商品不放进店铺，避免出现 ¥0 商品 */
  function isSellable(product) {
    return priceRange(product).min > 0;
  }

  function loadCart() {
    try {
      const raw = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
      if (!Array.isArray(raw)) return [];
      return raw
        .filter((line) => line && productById(line.id) && Number(line.qty) > 0)
        .map((line) => ({
          id: String(line.id),
          sku: String(line.sku || ""),
          qty: Math.min(99, Math.max(1, Number(line.qty) || 1))
        }));
    } catch (error) {
      return [];
    }
  }

  function saveCart() {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(state.cart));
    } catch (error) {
      /* storage may be unavailable on file:// in some browsers */
    }
  }

  function cartCount() {
    return state.cart.reduce((total, line) => total + line.qty, 0);
  }

  function cartTotal() {
    return state.cart.reduce((total, line) => {
      const product = productById(line.id);
      const sku = product.skus.find((item) => item.name === line.sku) || product.skus[0];
      return total + sku.price * line.qty;
    }, 0);
  }

  function cartLines() {
    return state.cart.map((line) => {
      const product = productById(line.id);
      const sku = product.skus.find((item) => item.name === line.sku) || product.skus[0];
      return { ...line, product, sku, lineTotal: sku.price * line.qty };
    });
  }

  function renderTabs() {
    const sellable = SHOP.products.filter(isSellable);
    const counts = { all: sellable.length };
    sellable.forEach((product) => {
      counts[product.cat] = (counts[product.cat] || 0) + 1;
    });

    els.tabs.innerHTML = SHOP.categories.map((category) => `
      <button
        type="button"
        class="cat-item${state.category === category.id ? " is-active" : ""}"
        role="tab"
        aria-selected="${state.category === category.id}"
        data-cat="${category.id}"
      >
        <span class="cat-icon cat-icon-${esc(category.id)}">${esc(CAT_MARK[category.id] || "A")}</span>
        <span class="cat-name">${esc(category.name)}</span>
        <span class="cat-count">${counts[category.id] || 0}</span>
      </button>
    `).join("");

    const current = SHOP.categories.find((category) => category.id === state.category);
    if (els.catTitle) {
      els.catTitle.textContent = state.category === "all" ? "全部商品" : (current ? current.name : "全部商品");
    }
  }

  function filteredProducts() {
    const keyword = state.search.trim().toLowerCase();
    let items = SHOP.products.filter((product) => {
      if (!isSellable(product)) return false;
      if (state.category !== "all" && product.cat !== state.category) return false;
      if (!keyword) return true;
      const haystack = [
        product.name,
        product.sub,
        product.brand,
        product.brandSub,
        product.tags.join(" "),
        product.cat
      ].join(" ").toLowerCase();
      return haystack.includes(keyword);
    });

    if (state.sort === "price-asc") {
      items = items.sort((a, b) => priceRange(a).min - priceRange(b).min);
    } else if (state.sort === "price-desc") {
      items = items.sort((a, b) => priceRange(b).min - priceRange(a).min);
    } else if (state.sort === "sales") {
      items = items.sort((a, b) => b.sold - a.sold);
    } else {
      items = items.sort((a, b) => a.featured - b.featured);
    }

    return items;
  }

  function productRow(product) {
    const range = priceRange(product);
    const hasRange = product.skus.length > 1 || range.min !== range.max;
    const tag = product.tags[0] || "官方渠道";
    const stockClass = STOCK_CLASS[product.stock.level] || "";
    const stockText = product.stock.level === "out" ? "已售罄" : product.stock.text;

    return `
      <article class="crow" data-cat="${product.cat}" data-product-id="${product.id}">
        <div class="crow-main">
          <span class="crow-thumb">
            ${product.cover
              ? `<img src="${esc(product.cover)}" alt="${esc(product.brand || product.name)} 标志" loading="lazy">`
              : `<span class="thumb-mark">${esc(String(product.mark || product.brand || product.name || "?").slice(0, 3))}</span>`}
          </span>
          <div class="crow-info">
            <a class="crow-name" href="#product-${product.id}" data-open-product="${product.id}">${esc(product.name)}</a>
            <div class="crow-tags">
              <span class="tag tag-gold">${esc(tag)}</span>
              <span class="tag tag-green">自动发货</span>
            </div>
          </div>
        </div>
        <div class="crow-price"><i>¥</i>${money(range.min)}${hasRange ? "<small>起</small>" : ""}</div>
        <div class="crow-stock ${stockClass}">${esc(stockText)}</div>
        <div class="crow-act">
          <button type="button" class="buy-btn" data-quick-add="${product.id}" aria-label="购买 ${esc(product.name)}">
            <svg class="icon"><use href="#i-bag"/></svg>
            <span>购买</span>
          </button>
        </div>
      </article>
    `;
  }

  function renderProducts() {
    const items = filteredProducts();
    const catalogEmpty = !SHOP.products.some(isSellable);

    els.grid.innerHTML = items.map(productRow).join("");
    els.grid.hidden = items.length === 0;
    els.empty.hidden = items.length > 0 || catalogEmpty;
    if (els.catalogEmpty) els.catalogEmpty.hidden = !catalogEmpty;
    if (els.catCount) els.catCount.textContent = `${items.length} 款`;

    if (state.search.trim()) {
      els.resultText.textContent = `找到 ${items.length} 款 · 关键词「${state.search.trim()}」`;
    } else {
      els.resultText.textContent = `共 ${items.length} 款商品`;
    }
  }

  function renderOverview() {
    const countEl = $("[data-stat-count]");
    if (countEl) countEl.textContent = String(SHOP.products.filter(isSellable).length);

    const rows = $("[data-receipt-rows]");
    const note = $("[data-receipt-note]");
    if (!rows) return;

    const top = SHOP.products
      .filter(isSellable)
      .slice()
      .sort((a, b) => (a.featured || 99) - (b.featured || 99))
      .slice(0, 3);

    if (!top.length) return;

    rows.innerHTML = top.map((product) => `
      <button type="button" class="receipt-row" data-open-product="${product.id}">
        <span class="receipt-brand">${esc(product.mark || CAT_MARK[product.cat] || "L")}</span>
        <span class="receipt-name">${esc(product.name)}<small>${esc(product.sub || "")}</small></span>
        <span class="receipt-price"><i>¥</i>${money(priceRange(product).min)}</span>
      </button>
    `).join("");

    if (note) note.textContent = `更新于 ${SHOP.updated || "—"} · 明码标价`;
  }

  function setCategory(categoryId, scroll = false) {
    state.category = categoryId;
    renderTabs();
    renderProducts();
    updateNavState();
    if (scroll) {
      $("#catalog").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function updateNavState() {
    $$(".main-nav a").forEach((link) => {
      const target = link.dataset.catLink;
      const isHome = !target && link.getAttribute("href") === "#catalog";
      link.classList.toggle("is-current", target ? target === state.category : isHome && state.category === "all");
    });
  }

  function openProduct(id) {
    const product = productById(id);
    if (!product) return;

    state.modalProductId = product.id;
    state.modalSku = 0;
    state.modalQty = 1;
    state.lastFocus = document.activeElement;

    const index = SHOP.products.findIndex((item) => item.id === product.id) + 1;
    const stockClass = STOCK_CLASS[product.stock.level] || "";

    els.modalMedia.dataset.cat = product.cat;
    els.modalMedia.innerHTML = `
      <span class="media-mark">${esc(product.mark || CAT_MARK[product.cat] || "L")}</span>
      <div class="media-top">
        <span class="media-no">NO. ${String(index).padStart(2, "0")}</span>
        <span class="stock-chip ${stockClass}">${esc(product.stock.text)}</span>
      </div>
      <div class="logo-tile">${product.cover
        ? `<img src="${esc(product.cover)}" alt="${esc(product.brand || product.name)} 标志">`
        : `<span class="tile-mark">${esc(String(product.mark || product.brand || product.name || "?").slice(0, 3))}</span>`}</div>
      <span class="media-tag">${esc(product.brand)} / ${esc(product.brandSub)}</span>
    `;

    els.modalContent.innerHTML = `
      <div class="modal-brandline">
        <span>${esc(product.brand)} / ${esc(product.brandSub)}</span>
        <span>已售 ${soldText(product.sold)}</span>
      </div>
      <h2>${esc(product.name)}</h2>
      <p class="modal-sub">${esc(product.sub)}</p>
      <div class="modal-price-row">
        <span class="price" data-modal-price><i>¥</i>${money(product.price)}</span>
        <span class="modal-stock ${stockClass}" data-modal-stock>${esc(product.stock.text)}</span>
      </div>
      <div class="sku-label"><span>${esc(product.skuLabel || "选择规格")}</span><span>${product.skus.length} 种</span></div>
      <div class="sku-list">
        ${product.skus.map((sku, skuIndex) => `
          <button type="button" class="sku-option${skuIndex === 0 ? " is-selected" : ""}" data-sku-index="${skuIndex}">
            <span class="sku-radio"></span>
            <span>
              <span class="sku-name">${esc(sku.name)}</span>
              ${sku.hint ? `<span class="sku-hint">${esc(sku.hint)}</span>` : ""}
            </span>
            <span class="sku-price">¥${money(sku.price)}</span>
          </button>
        `).join("")}
      </div>
      <div class="modal-buy-row">
        <div class="qty">
          <button type="button" data-modal-minus aria-label="减少数量"><svg class="icon"><use href="#i-minus"/></svg></button>
          <span data-modal-qty>1</span>
          <button type="button" data-modal-plus aria-label="增加数量"><svg class="icon"><use href="#i-plus"/></svg></button>
        </div>
        <button type="button" class="btn btn-primary" data-modal-add>
          ${product.stock.level === "out" ? "预订此商品" : "加入购物袋"}
          <svg class="icon"><use href="#i-bag"/></svg>
        </button>
      </div>
      <dl class="modal-meta">
        <div><dt>发货方式</dt><dd>自动发货</dd></div>
        <div><dt>售后方式</dt><dd>按商品说明</dd></div>
        <div><dt>价格单位</dt><dd>人民币 / 件</dd></div>
      </dl>
      <div class="modal-details">
        <details open>
          <summary>商品说明</summary>
          <ul>${product.highlights.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>
        </details>
        <details>
          <summary>购买须知</summary>
          <ul>${product.notes.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>
        </details>
      </div>
    `;

    els.productModal.hidden = false;
    document.body.classList.add("no-scroll");
    setTimeout(() => $(".modal-panel").focus({ preventScroll: true }), 30);
  }

  function closeProduct() {
    if (els.productModal.hidden) return;
    els.productModal.hidden = true;
    document.body.classList.remove("no-scroll");
    if (state.lastFocus && typeof state.lastFocus.focus === "function") {
      state.lastFocus.focus();
    }
  }

  function selectSku(skuIndex) {
    const product = productById(state.modalProductId);
    if (!product || !product.skus[skuIndex]) return;
    state.modalSku = skuIndex;
    $$(".sku-option", els.modalContent).forEach((option, index) => {
      option.classList.toggle("is-selected", index === skuIndex);
    });
    const priceEl = $("[data-modal-price]", els.modalContent);
    if (priceEl) priceEl.innerHTML = `<i>¥</i>${money(product.skus[skuIndex].price)}`;
  }

  function addToCart(productId, skuName, qty = 1) {
    const product = productById(productId);
    if (!product) return;
    const sku = product.skus.find((item) => item.name === skuName) || product.skus[0];
    const existing = state.cart.find((line) => line.id === product.id && line.sku === sku.name);

    if (existing) {
      existing.qty = Math.min(99, existing.qty + qty);
    } else {
      state.cart.push({ id: product.id, sku: sku.name, qty: Math.min(99, qty) });
    }

    saveCart();
    renderCart();
    updateCartBadge();
    showToast(`已加入购物袋 · ${product.name}`);
  }

  function updateLine(index, delta) {
    const line = state.cart[index];
    if (!line) return;
    line.qty = Math.min(99, Math.max(1, line.qty + delta));
    saveCart();
    renderCart();
    updateCartBadge();
  }

  function removeLine(index) {
    const line = state.cart[index];
    state.cart.splice(index, 1);
    saveCart();
    renderCart();
    updateCartBadge();
    if (line) showToast("已从购物袋移除");
  }

  function updateCartBadge() {
    const count = cartCount();
    els.cartCounts.forEach((el) => {
      el.textContent = count > 99 ? "99+" : String(count);
    });
    els.drawerCount.textContent = String(count);
  }

  function renderCart() {
    const lines = cartLines();
    updateCartBadge();
    els.cartList.innerHTML = lines.map((line, index) => `
      <article class="cart-item">
        <div class="cart-thumb" data-cat="${line.product.cat}">
          <img src="${line.product.cover}" alt="">
        </div>
        <div class="cart-info">
          <strong>${esc(line.product.name)}</strong>
          <small>${esc(line.sku.name)}</small>
          <div class="cart-line-bottom">
            <div class="qty">
              <button type="button" data-line-minus="${index}" aria-label="减少数量"><svg class="icon"><use href="#i-minus"/></svg></button>
              <span>${line.qty}</span>
              <button type="button" data-line-plus="${index}" aria-label="增加数量"><svg class="icon"><use href="#i-plus"/></svg></button>
            </div>
            <span class="line-price">¥${money(line.lineTotal)}</span>
          </div>
        </div>
        <button type="button" class="cart-remove" data-line-remove="${index}" aria-label="移除 ${esc(line.product.name)}">移除</button>
      </article>
    `).join("");

    els.cartEmpty.hidden = lines.length > 0;
    els.cartList.hidden = lines.length === 0;
    els.cartTotal.textContent = `¥${money(cartTotal())}`;
    els.checkoutBtn.disabled = lines.length === 0;
    els.cartFoot.hidden = lines.length === 0 || currentView() !== "cart";
  }

  function currentView() {
    const view = $(".drawer-view:not([hidden])", els.cartDrawer);
    return view ? view.dataset.view : "cart";
  }

  function setDrawerView(view) {
    $$(".drawer-view", els.cartDrawer).forEach((el) => {
      el.hidden = el.dataset.view !== view;
    });
    els.cartFoot.hidden = view !== "cart" || state.cart.length === 0;
    if (view === "checkout") renderCheckoutSummary();
    if (view === "cart") renderCart();
  }

  function renderCheckoutSummary() {
    const lines = cartLines();
    const total = cartTotal();
    els.checkoutSummary.innerHTML = `
      ${lines.map((line) => `
        <div class="summary-row">
          <span>${esc(line.product.name)} × ${line.qty}</span>
          <span>¥${money(line.lineTotal)}</span>
        </div>
      `).join("")}
      <div class="summary-row total">
        <span>合计</span>
        <span>¥${money(total)}</span>
      </div>
    `;
  }

  function openCart(view = "cart") {
    if (els.cartDrawer.classList.contains("is-open")) {
      setDrawerView(view);
      return;
    }
    state.lastFocus = document.activeElement;
    renderCart();
    setDrawerView(view);
    els.cartDrawer.inert = false;
    els.scrim.hidden = false;
    els.cartDrawer.setAttribute("aria-hidden", "false");
    requestAnimationFrame(() => {
      els.scrim.classList.add("is-open");
      els.cartDrawer.classList.add("is-open");
    });
    document.body.classList.add("no-scroll");
    setTimeout(() => els.cartDrawer.focus({ preventScroll: true }), 80);
  }

  function closeCart() {
    if (!els.cartDrawer.classList.contains("is-open")) return;
    els.cartDrawer.classList.remove("is-open");
    els.scrim.classList.remove("is-open");
    els.cartDrawer.setAttribute("aria-hidden", "true");
    document.body.classList.remove("no-scroll");
    setTimeout(() => {
      if (!els.cartDrawer.classList.contains("is-open")) {
        els.scrim.hidden = true;
        els.cartDrawer.inert = true;
        setDrawerView("cart");
      }
    }, 380);
    if (state.lastFocus && typeof state.lastFocus.focus === "function") {
      state.lastFocus.focus();
    }
  }

  function submitOrder(event) {
    event.preventDefault();
    const form = els.checkoutForm;
    const name = form.elements.name.value.trim();
    const contact = form.elements.contact.value.trim();
    const note = form.elements.note.value.trim();

    if (!name || !contact) {
      els.formError.hidden = false;
      if (!name) form.elements.name.focus();
      else form.elements.contact.focus();
      return;
    }
    els.formError.hidden = true;

    const now = new Date();
    const datePart = [
      String(now.getFullYear()).slice(2),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0")
    ].join("");
    const randomPart = String(Math.floor(1000 + Math.random() * 9000));
    const orderNo = `LN${datePart}-${randomPart}`;
    const lines = cartLines();
    const total = cartTotal();

    state.lastOrder = {
      no: orderNo,
      name,
      contact,
      note,
      total,
      items: lines.map((line) => ({
        name: line.product.name,
        sku: line.sku.name,
        qty: line.qty,
        price: line.sku.price
      })),
      createdAt: now.toISOString()
    };

    try {
      localStorage.setItem(LAST_ORDER_KEY, JSON.stringify(state.lastOrder));
    } catch (error) {
      /* ignore */
    }

    els.orderNo.textContent = orderNo;
    els.orderTotal.textContent = `合计 ¥${money(total)} · ${cartCount()} 件`;
    els.cartDrawer.classList.add("has-order");

    state.cart = [];
    saveCart();
    renderCart();
    updateCartBadge();
    form.reset();
    els.toast.classList.remove("is-visible");
    setDrawerView("success");
  }

  function orderText() {
    const order = state.lastOrder;
    if (!order) return "";
    const lines = order.items.map((item) => `${item.name} / ${item.sku} × ${item.qty}`).join("\n");
    return [
      "小杨TK · 订购单",
      `订单号：${order.no}`,
      `称呼：${order.name}`,
      `联系方式：${order.contact}`,
      `商品：\n${lines}`,
      `合计：¥${money(order.total)}`,
      order.note ? `备注：${order.note}` : ""
    ].filter(Boolean).join("\n");
  }

  async function copyOrder() {
    const text = orderText();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      showToast("订单信息已复制");
    } catch (error) {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      try {
        document.execCommand("copy");
        showToast("订单信息已复制");
      } catch (copyError) {
        showToast("复制失败，请手动截图保存");
      }
      area.remove();
    }
  }

  function showToast(message) {
    window.clearTimeout(state.toastTimer);
    els.toast.textContent = message;
    els.toast.classList.add("is-visible");
    state.toastTimer = window.setTimeout(() => {
      els.toast.classList.remove("is-visible");
    }, 2300);
  }

  function toggleMenu(force) {
    const shouldOpen = typeof force === "boolean" ? force : els.mobileMenu.hidden;
    els.mobileMenu.hidden = !shouldOpen;
    els.menuToggle.setAttribute("aria-expanded", String(shouldOpen));
  }

  function trapFocus(event, container) {
    if (event.key !== "Tab") return;
    const focusables = $$('a[href], button:not([disabled]), input, select, textarea, summary, [tabindex]:not([tabindex="-1"])', container)
      .filter((el) => el.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  // Events -----------------------------------------------------------------

  els.tabs.addEventListener("click", (event) => {
    const tab = event.target.closest("[data-cat]");
    if (tab) setCategory(tab.dataset.cat);
  });

  els.grid.addEventListener("click", (event) => {
    const quickAdd = event.target.closest("[data-quick-add]");
    if (quickAdd) {
      event.preventDefault();
      const product = productById(quickAdd.dataset.quickAdd);
      if (product) addToCart(product.id, product.skus[0].name, 1);
      return;
    }
    const open = event.target.closest("[data-open-product]");
    if (open) {
      event.preventDefault();
      openProduct(open.dataset.openProduct);
    }
  });

  els.grid.addEventListener("keydown", (event) => {
    if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-open-product]")) {
      event.preventDefault();
      openProduct(event.target.dataset.openProduct);
    }
  });

  let searchTimer = null;
  els.search.addEventListener("input", () => {
    state.search = els.search.value;
    els.searchClear.hidden = !state.search;
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(renderProducts, 90);
  });

  els.searchClear.addEventListener("click", () => {
    els.search.value = "";
    state.search = "";
    els.searchClear.hidden = true;
    renderProducts();
    els.search.focus();
  });

  if (els.sort) {
    els.sort.addEventListener("change", () => {
      state.sort = els.sort.value;
      renderProducts();
    });
  }

  const searchGo = $("[data-search-go]");
  if (searchGo) {
    searchGo.addEventListener("click", () => {
      state.search = els.search.value;
      els.searchClear.hidden = !state.search;
      renderProducts();
    });
  }

  els.reset.addEventListener("click", () => {
    state.category = "all";
    state.search = "";
    state.sort = "featured";
    els.search.value = "";
    els.searchClear.hidden = true;
    if (els.sort) els.sort.value = "featured";
    renderTabs();
    renderProducts();
    updateNavState();
  });

  $$("[data-cat-link]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      setCategory(link.dataset.catLink, true);
      toggleMenu(false);
    });
  });

  $(".search-jump").addEventListener("click", () => {
    $("#catalog").scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => els.search.focus({ preventScroll: true }), 450);
  });

  const receiptRows = $("[data-receipt-rows]");
  if (receiptRows) {
    receiptRows.addEventListener("click", (event) => {
      const button = event.target.closest("[data-open-product]");
      if (button) openProduct(button.dataset.openProduct);
    });
  }

  $$("[data-open-product]").forEach((button) => {
    if (!button.closest("[data-product-grid]")) {
      button.addEventListener("click", () => openProduct(button.dataset.openProduct));
    }
  });

  $$("[data-open-cart]").forEach((button) => {
    button.addEventListener("click", () => openCart("cart"));
  });

  $("[data-close-cart]").addEventListener("click", closeCart);
  els.scrim.addEventListener("click", closeCart);

  els.cartDrawer.addEventListener("click", (event) => {
    if (event.target.closest("[data-close-cart]")) {
      closeCart();
      return;
    }
    const minus = event.target.closest("[data-line-minus]");
    const plus = event.target.closest("[data-line-plus]");
    const remove = event.target.closest("[data-line-remove]");
    if (minus) updateLine(Number(minus.dataset.lineMinus), -1);
    if (plus) updateLine(Number(plus.dataset.linePlus), 1);
    if (remove) removeLine(Number(remove.dataset.lineRemove));

    if (event.target.closest("[data-checkout]")) {
      setDrawerView("checkout");
    }
    if (event.target.closest("[data-back-cart]")) {
      setDrawerView("cart");
    }
    if (event.target.closest("[data-finish-order]")) {
      closeCart();
    }
    if (event.target.closest("[data-copy-order]")) {
      copyOrder();
    }
    if (event.target.closest("[data-send-order]")) {
      copyOrder().then(() => {
        window.open(
          "https://wpa.qq.com/msgrd?v=3&uin=3435705521&site=qq&menu=yes",
          "_blank",
          "noopener"
        );
      });
    }
  });

  els.checkoutForm.addEventListener("submit", submitOrder);

  $("[data-close-product]").addEventListener("click", closeProduct);

  els.productModal.addEventListener("click", (event) => {
    if (event.target === els.productModal) {
      closeProduct();
      return;
    }
    const sku = event.target.closest("[data-sku-index]");
    if (sku) {
      selectSku(Number(sku.dataset.skuIndex));
      return;
    }
    if (event.target.closest("[data-modal-minus]")) {
      state.modalQty = Math.max(1, state.modalQty - 1);
      $("[data-modal-qty]", els.modalContent).textContent = String(state.modalQty);
      return;
    }
    if (event.target.closest("[data-modal-plus]")) {
      state.modalQty = Math.min(99, state.modalQty + 1);
      $("[data-modal-qty]", els.modalContent).textContent = String(state.modalQty);
      return;
    }
    if (event.target.closest("[data-modal-add]")) {
      const product = productById(state.modalProductId);
      if (!product) return;
      const sku = skuOf(product, state.modalSku);
      addToCart(product.id, sku.name, state.modalQty);
      const button = $("[data-modal-add]", els.modalContent);
      if (button) {
        const original = button.innerHTML;
        button.innerHTML = '<svg class="icon"><use href="#i-check"/></svg> 已加入';
        button.disabled = true;
        setTimeout(() => {
          if (!document.body.contains(button)) return;
          button.innerHTML = original;
          button.disabled = false;
        }, 1100);
      }
      return;
    }
  });

  els.menuToggle.addEventListener("click", () => toggleMenu());

  $$("[data-mobile-menu] a").forEach((link) => {
    link.addEventListener("click", () => toggleMenu(false));
  });

  document.addEventListener("click", (event) => {
    if (!els.mobileMenu.hidden && !event.target.closest(".site-header")) {
      toggleMenu(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (!els.productModal.hidden) closeProduct();
      else if (els.cartDrawer.classList.contains("is-open")) closeCart();
      else if (!els.mobileMenu.hidden) toggleMenu(false);
    }
    if (!els.productModal.hidden) trapFocus(event, els.productModal);
    else if (els.cartDrawer.classList.contains("is-open")) trapFocus(event, els.cartDrawer);
  });

  window.addEventListener("scroll", () => {
    els.header.classList.toggle("is-scrolled", window.scrollY > 8);
  }, { passive: true });

  // Reveal on scroll
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.04 });

    $$(".section-head, .assurance-list, .step-grid, .faq-list, .receipt").forEach((el) => {
      el.classList.add("reveal");
      observer.observe(el);
    });
  }

  async function renderAdminEntry() {
    if (!window.Auth) return;
    const session = await Auth.session();
    const isOwner = session ? await Auth.isOwner(session) : false;

    $$("[data-admin-jump]").forEach((el) => {
      el.hidden = !isOwner;
    });

    const accountLabel = $("[data-account-jump] span");
    if (accountLabel) accountLabel.textContent = session ? "我的账号" : "登录";
  }

  // Boot -------------------------------------------------------------------

  renderTabs();
  renderProducts();
  renderOverview();
  renderAdminEntry();
  renderCart();
  updateNavState();
})();
