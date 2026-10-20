window.SHOP = {
  updated: "2026-10-17",
  contact: {
    qq: "2922695362",
    hours: "10:00 – 24:00"
  },
  categories: [
    { id: "all", name: "全部", en: "ALL" },
    { id: "gpt", name: "GPT", en: "OPENAI" },
    { id: "claude", name: "Claude", en: "ANTHROPIC" },
    { id: "grok", name: "Grok", en: "XAI" }
  ],
  products: [
    {
      id: "51",
      cat: "gpt",
      brand: "OPENAI",
      brandSub: "GPT",
      mark: "PLUS",
      name: "GPT Plus 月卡",
      sub: "官方直充 · 30 天订阅质保",
      price: 132,
      stock: { level: "high", text: "库存充足" },
      sold: 15762,
      featured: 1,
      tags: ["热卖", "官方直充"],
      skuLabel: "选择充值方案",
      skus: [
        { name: "渠道 1 · 开通卡密", price: 132, hint: "海外银行卡通道 · 通常几十秒至 3 分钟到账" },
        { name: "渠道 1 · 全程卡密", price: 133, hint: "覆盖整个订阅周期的质保" },
        { name: "渠道 3 · 开通卡密", price: 139, hint: "iOS 通道 · 兼容性更高 · 通常秒充" },
        { name: "渠道 3 · 全程卡密", price: 140, hint: "iOS 通道 · 可覆盖现有订阅" }
      ],
      highlights: [
        "下单自动发送 CDK 卡密与激活地址，按页面提示自助完成充值。",
        "渠道 1 走海外银行卡通道，通常几十秒至 3 分钟到账。",
        "渠道 3 走 iOS 通道，兼容性更高，通常秒充，可直接覆盖现有订阅。",
        "质保方案仅覆盖订阅异常掉线，按所选档位处理。"
      ],
      notes: [
        "渠道 1 不能直接为部分已有订阅的账号充值；原订阅为 iOS / Google Pay 的账号，通常需等待约 3 天。",
        "账号封禁、平台风控、模型表现变化不属于充值售后范围。",
        "未使用的卡密可在 24 小时内申请退款。"
      ],
      cover: "assets/img/products/51.png"
    },
    {
      id: "46",
      cat: "claude",
      brand: "ANTHROPIC",
      brandSub: "CLAUDE",
      mark: "PRO",
      name: "Claude Pro 月卡",
      sub: "官方直充 · 30 天订阅质保",
      price: 164.4,
      stock: { level: "high", text: "现货充足" },
      sold: 1571,
      featured: 2,
      tags: ["热卖", "质保 30 天"],
      skuLabel: "选择质保方案",
      skus: [
        { name: "质保首次登录", price: 164.4, hint: "覆盖首次登录与订阅掉线" },
        { name: "质保全程", price: 165.6, hint: "覆盖整个订阅周期内掉线" }
      ],
      highlights: [
        "官方渠道直充，支持订阅掉线质保。",
        "当前有会员、账单逾期或处于宽限期的账号无法到账。",
        "历史没有订阅记录、提前过 KYC 的账号不建议下单。",
        "Claude Max 档位会触发 KYC，介意请勿购买。"
      ],
      notes: [
        "不支持覆盖现有订阅；团队版、0 元购、自动续费未取消、绑定银行卡的账号请先处理。",
        "账号封禁不属于质保范围；掉订阅按使用天数退还剩余金额。",
        "下单前请逐条核对商品页列出的账号条件。"
      ],
      cover: "assets/img/products/46.jpg"
    },
    {
      id: "267",
      cat: "gpt",
      brand: "OPENAI",
      brandSub: "GPT",
      mark: "5X",
      name: "ChatGPT 5X",
      sub: "100 美元档 · 三种充值方案",
      price: 660,
      stock: { level: "high", text: "库存充足" },
      sold: 1287,
      featured: 3,
      tags: ["官方直充", "自动发货"],
      skuLabel: "选择充值方案",
      skus: [
        { name: "iOS 充值", price: 660, hint: "限制最少 · 可直接覆盖 · 全新 30 天" },
        { name: "卡付充值 · 智利", price: 685, hint: "适合当前没有订阅的账号" },
        { name: "卡付充值 · 菲区", price: 710, hint: "适合本身为菲区 Plus 的账号" }
      ],
      highlights: [
        "iOS 方案限制最少，可直接覆盖为全新的 30 天 5X 订阅。",
        "智利卡充适合当前没有订阅的账号；菲区卡充适合本身为菲区 Plus 的账号。",
        "不确定历史充值方式时，优先选择 iOS 方案。",
        "CDK 自动发货，按激活页提示自助完成充值。"
      ],
      notes: [
        "当前 Plus 为菲区订阅时，请勿选择智利卡充，充值失败会产生手续费且不退。",
        "上一次为 iOS 充值的账号，需掉订阅满 72 小时后再使用卡充方案。",
        "质保仅覆盖订阅掉线，账号封禁不在范围。"
      ],
      cover: "assets/img/products/267.png"
    },
    {
      id: "284",
      cat: "grok",
      brand: "XAI",
      brandSub: "GROK",
      mark: "X+",
      name: "X Premium+ 年卡",
      sub: "赠 Super Grok 一年 · iOS 官方充值",
      price: 696,
      stock: { level: "low", text: "所剩无几" },
      sold: 102,
      featured: 4,
      tags: ["年卡", "赠 Super Grok"],
      skuLabel: "商品规格",
      skus: [{ name: "X Premium+ 年卡 · 含 Super Grok", price: 696, hint: "一次到账 1 年" }],
      highlights: [
        "一次到账 1 年 X Premium+，含一年 Super Grok 权益。",
        "官方年付价 400 美元，采用正规 iOS 渠道充值。",
        "CDK 自助提交，无需提供账号密码。",
        "未使用卡密长期有效，可需要时再兑换。"
      ],
      notes: [
        "iOS 订阅不显示到期时间，属于平台规则。",
        "本商品为旧版 X Premium+ 与 Super Grok 组合，不是最新三合一版本，下单前请确认。",
        "仅提供 1 个月质保，超过 1 个月不在质保范围。",
        "已有订阅的账号不建议强行覆盖，失败无法退款。",
        "账号封禁、平台风控不在售后范围。"
      ],
      cover: "assets/img/products/284.png"
    },
    {
      id: "127",
      cat: "claude",
      brand: "ANTHROPIC",
      brandSub: "CLAUDE",
      mark: "MAX",
      name: "Claude Max 5X / 20X",
      sub: "iOS 渠道 · CDK 自动充值",
      price: 984,
      stock: { level: "low", text: "所剩无几" },
      sold: 204,
      featured: 5,
      tags: ["高额度", "iOS 渠道"],
      skuLabel: "选择档位",
      skus: [
        { name: "Claude Max 5X", price: 984, hint: "5 倍用量档位" },
        { name: "Claude Max 20X", price: 1956, hint: "20 倍用量档位" }
      ],
      highlights: [
        "采用 iOS 订阅方式充值，CDK 自动发货。",
        "账号必须有过 Claude 订阅记录，且当前没有有效订阅。",
        "Max 5X / 20X 充值后会触发 KYC，请确认能够完成验证。",
        "支持订阅掉线按剩余使用天数退款。"
      ],
      notes: [
        "已过 KYC、团队版、Google 账单逾期 / 宽限期、未关闭自动续费、绑定银行卡、0 元购记录的账号均不建议下单。",
        "账号封禁不属于质保范围。",
        "条件较严，拿不准请先咨询客服。"
      ],
      cover: "assets/img/products/127.jpg"
    },
    {
      id: "268",
      cat: "gpt",
      brand: "OPENAI",
      brandSub: "GPT",
      mark: "200",
      name: "ChatGPT 200 美元档",
      sub: "10X 额度 · CDK 秒发",
      price: 1140,
      stock: { level: "high", text: "现货充足" },
      sold: 587,
      featured: 6,
      tags: ["官方直充", "自动发货"],
      skuLabel: "选择充值方案",
      skus: [
        { name: "卡充新开", price: 1140, hint: "无订阅，或原订阅通过银行卡办理" },
        { name: "卡充续费", price: 1150, hint: "到期前 24 小时 · 人工处理" },
        { name: "iOS 无视一切秒充", price: 1380, hint: "限制最少 · 适合不确定历史的账号" }
      ],
      highlights: [
        "iOS 方案适合绝大多数正常账号，限制最少，可快速激活 200 美元档。",
        "卡充新开适合当前无订阅，或原订阅通过银行卡办理的账号。",
        "卡充续费仅接受到期前 24 小时内、且上一次为银行卡充值的账号。",
        "续费为人工处理，下单后按客服指引操作。"
      ],
      notes: [
        "原 Plus / 5X 通过 iOS 开通的账号，无法用银行卡方式直接覆盖升级，请选择 iOS 方案。",
        "10 月 29 日之后，200 美元档位统一为 10X，具体以平台实际显示为准。",
        "账号封禁不属于质保范围。"
      ],
      cover: "assets/img/products/268.png"
    },
    {
      id: "348",
      cat: "gpt",
      brand: "OPENAI",
      brandSub: "GPT",
      mark: "25X",
      name: "ChatGPT 25X",
      sub: "500 美元档 · 高额度方案",
      price: 3240,
      stock: { level: "mid", text: "数量有限" },
      sold: 29,
      featured: 7,
      tags: ["500 美元档", "高额度"],
      skuLabel: "选择充值方式",
      skus: [
        { name: "iOS 端充值", price: 3240, hint: "高额度档位 · iOS 渠道" },
        { name: "智利低价区卡充", price: 3250, hint: "低价区银行卡通道" }
      ],
      highlights: [
        "500 美元高额度档位，适合高频使用与重度工作流。",
        "提供 iOS 端充值与智利低价区卡充两种方式。",
        "CDK 自动发货，按激活页提示自助完成。",
        "适合对额度有明确需求的长期使用者。"
      ],
      notes: [
        "高额度档位对账号状态与地区更敏感，下单前请先咨询客服确认。",
        "质保仅覆盖订阅异常掉线。",
        "账号封禁、平台风控不在售后范围。"
      ],
      cover: "assets/img/products/348.png"
    },
    {
      id: "269",
      cat: "gpt",
      brand: "OPENAI",
      brandSub: "GPT",
      mark: "12M",
      name: "GPT Plus 年卡",
      sub: "12 个月 · 官方代充",
      price: 1555,
      stock: { level: "out", text: "已售罄 · 可预订" },
      sold: 74,
      featured: 8,
      tags: ["年卡", "可预订"],
      skuLabel: "商品规格",
      skus: [{ name: "GPT Plus 年卡 · 12 个月", price: 1555, hint: "补货后按付款顺序发货" }],
      highlights: [
        "一次开通 12 个月 Plus，省去每月续费。",
        "官方渠道代充，适合长期稳定使用。",
        "当前无现货，可下预约单。",
        "补货后按付款顺序安排发货。"
      ],
      notes: [
        "预约商品付款后不会立即发货，补货后按顺序处理。",
        "到货后可在订单查询页面查看进度。",
        "价格可能随渠道调整，下单前以页面为准。"
      ],
      cover: "assets/img/products/269.png"
    },
    {
      id: "213",
      cat: "gpt",
      brand: "OPENAI",
      brandSub: "GPT",
      mark: "ID",
      name: "GPT 专属邮箱普号",
      sub: "美国家宽注册 · 质保首登",
      price: 20,
      stock: { level: "high", text: "现货充足" },
      sold: 464,
      featured: 9,
      tags: ["成品账号", "质保首登"],
      skuLabel: "商品规格",
      skus: [{ name: "GPT 专属邮箱普号", price: 20, hint: "非日抛 · 带快速取件地址" }],
      highlights: [
        "非日抛账号，适合个人长期使用。",
        "美国家宽网络环境注册。",
        "质保首次登录，附带快速取件地址。",
        "可作为开通 GPT 会员的基础账号。"
      ],
      notes: [
        "成品账号仅保证首次登录，改密、二次验证、风控封禁不在售后范围。",
        "建议首次登录后及时修改密码并保存恢复信息。",
        "账号类商品一经登录使用不支持退款。"
      ],
      cover: "assets/img/products/213.png"
    },
    {
      id: "209",
      cat: "grok",
      brand: "XAI",
      brandSub: "GROK",
      mark: "X+",
      name: "X Premium+ 月卡",
      sub: "赠 Super Grok · 官方 CDK",
      price: 204,
      stock: { level: "low", text: "所剩无几" },
      sold: 22,
      featured: 10,
      tags: ["月卡", "赠 Super Grok"],
      skuLabel: "商品规格",
      skus: [{ name: "X Premium+ 月卡 · 含 Super Grok", price: 204, hint: "30 天订阅" }],
      highlights: [
        "30 天 X Premium+，含 Super Grok 权益。",
        "官方渠道 CDK 充值，自助提交。",
        "无需提供账号密码。",
        "适合先体验一个月再决定是否续费。"
      ],
      notes: [
        "本商品为旧版 X Premium+ 与 Super Grok 组合，不是最新三合一版本，下单前请确认。",
        "已有订阅的账号不建议覆盖，失败无法退款。",
        "账号封禁、平台风控不在售后范围。",
        "未使用卡密长期有效。"
      ],
      cover: "assets/img/products/209.png"
    },
    {
      id: "210",
      cat: "grok",
      brand: "XAI",
      brandSub: "GROK",
      mark: "3M",
      name: "Grok Super 季卡",
      sub: "3 个月 · 全程质保",
      price: 324,
      stock: { level: "low", text: "所剩无几" },
      sold: 72,
      featured: 11,
      tags: ["季卡", "全程质保"],
      skuLabel: "商品规格",
      skus: [{ name: "Grok Super 季卡 · 3 个月", price: 324, hint: "官方正规充值" }],
      highlights: [
        "一次开通 3 个月 Grok Super 订阅。",
        "官方正规渠道充值，CDK 自动发货。",
        "全程订阅质保，按商品页规则处理。",
        "适合稳定使用、不想每月续费的用户。"
      ],
      notes: [
        "本商品为旧版 Grok Super 方案，不是最新三合一版本，下单前请确认。",
        "已有订阅的账号请先咨询客服，确认能否覆盖。",
        "账号封禁、平台风控不在质保范围。",
        "未使用卡密可在 24 小时内申请退款。"
      ],
      cover: "assets/img/products/210.png"
    },
    {
      id: "211",
      cat: "grok",
      brand: "XAI",
      brandSub: "GROK",
      mark: "1M",
      name: "Grok Super 月卡",
      sub: "30 美元档 · iOS 渠道",
      price: 186,
      stock: { level: "out", text: "已售罄 · 可预订" },
      sold: 236,
      featured: 12,
      tags: ["iOS 渠道", "可预订"],
      skuLabel: "商品规格",
      skus: [{ name: "Grok Super 月卡 · 30 天", price: 186, hint: "补货后按付款顺序发货" }],
      highlights: [
        "30 美元档 Grok Super 月卡。",
        "采用 iOS 渠道官方正规充值。",
        "CDK 自动发货，无需账号密码。",
        "当前缺货，可先下预约单。"
      ],
      notes: [
        "本商品为旧版 Grok Super 方案，不是最新三合一版本，下单前请确认。",
        "预约商品补货后按付款顺序发货。",
        "已有订阅的账号不建议强行覆盖。",
        "账号封禁、平台风控不在售后范围。"
      ],
      cover: "assets/img/products/211.png"
    },
    {
      id: "285",
      cat: "grok",
      brand: "XAI",
      brandSub: "GROK",
      mark: "ID",
      name: "Grok 专属普号",
      sub: "成品账号 · 用于开通会员",
      price: 14,
      stock: { level: "mid", text: "数量有限" },
      sold: 32,
      featured: 13,
      tags: ["成品账号", "低门槛"],
      skuLabel: "商品规格",
      skus: [{ name: "Grok 专属普号 · 无会员", price: 14, hint: "适合自行开通 Grok 会员" }],
      highlights: [
        "无会员的普通账号，适合用来开通 Grok 会员。",
        "成品账号，交付即可登录。",
        "低门槛，适合需要独立账号的用户。",
        "质保首次登录。"
      ],
      notes: [
        "成品账号仅保证首次登录，账号风控、改密不在售后范围。",
        "建议首次登录后及时修改密码并绑定自己的邮箱。",
        "账号类商品一经登录使用不支持退款。"
      ],
      cover: "assets/img/products/285.png"
    }
  ]
};
