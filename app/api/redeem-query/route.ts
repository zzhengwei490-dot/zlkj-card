import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// 🔴 原有接口：ActCard
const ACT_REDEEM_URL = "https://actcard.xyz/api/keys/redeem";
const ACT_QUERY_URL  = "https://actcard.xyz/api/keys/query";

// 🟢 新增接口：EFun Card
const EFUN_BASE_URL     = "https://card.efuncard.com/api/external";
const EFUN_REDEEM_URL   = `${EFUN_BASE_URL}/redeem`;
const EFUN_CANCEL_URL   = `${EFUN_BASE_URL}/cards/cancel`;
const EFUN_3DS_URL      = `${EFUN_BASE_URL}/3ds/verify`;
// GET 接口需要拼接 code：
//   查询卡片: GET ${EFUN_BASE_URL}/cards/query/:code
//   账单查询: GET ${EFUN_BASE_URL}/billing/:code

// EFun Card API Key（Bearer Token）
const EFUN_API_KEY = "b352d13f20462ed46cff0aa417065496bd811eb8396b2e2fee11aeacb796fc00";

// ─────────────────────────────────────────────────────
// 工具函数：POST JSON
// ─────────────────────────────────────────────────────
async function postJson(url: string, payload: any, headers: Record<string, string> = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        ...headers,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: controller.signal,
    });

    const text = await res.text();
    let data: any = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }

    return { ok: res.ok, status: res.status, data };
  } finally {
    clearTimeout(timer);
  }
}

// ─────────────────────────────────────────────────────
// 工具函数：GET JSON（用于 EFun 查询接口）
// ─────────────────────────────────────────────────────
async function getJson(url: string, headers: Record<string, string> = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        ...headers,
      },
      cache: "no-store",
      signal: controller.signal,
    });

    const text = await res.text();
    let data: any = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }

    return { ok: res.ok, status: res.status, data };
  } finally {
    clearTimeout(timer);
  }
}

// EFun 请求头（携带 Bearer Token）
const efunHeaders = () => ({
  Authorization: `Bearer ${EFUN_API_KEY}`,
});

// ─────────────────────────────────────────────────────
// 主处理函数
// ─────────────────────────────────────────────────────
export async function POST(request: Request) {
  const startedAt = new Date().toISOString();

  let body: Record<string, any> = {};
  try {
    body = (await request.json()) ?? {};
  } catch {
    return NextResponse.json({ ok: false, error: "请求体不是合法 JSON" }, { status: 400 });
  }

  // ─────────────────────────────────────────────────────
  // 🔵 action = "3ds"：EFun Card 3DS 验证码查询
  // ─────────────────────────────────────────────────────
  if (body.action === "3ds") {
    const code = body.code ?? body.key_id ?? body.key ?? body.cardKey ?? body.token;

    if (!code || typeof code !== "string") {
      return NextResponse.json({ ok: false, error: "缺少 code（CDK 激活码）字段" }, { status: 400 });
    }

    const minutes = typeof body.minutes === "number" ? body.minutes : 30;

    const res = await postJson(
      EFUN_3DS_URL,
      { code, minutes },
      efunHeaders()
    ).catch((e) => ({ ok: false, status: 500, data: { error: String(e) } }));

    const d = res.data ?? {};

    if (d.success === true && d.data) {
      return NextResponse.json({
        ok: true,
        cardId:        d.data.cardId,
        code:          d.data.code,
        verifications: d.data.verifications ?? [],
        meta: { httpStatus: res.status },
      });
    }

    return NextResponse.json({
      ok: false,
      error: d.message ?? d.error ?? "3DS 验证码查询失败",
      meta: { httpStatus: res.status },
    });
  }

  // ─────────────────────────────────────────────────────
  // 🔵 action = "query"：EFun Card 查询卡片信息
  // ─────────────────────────────────────────────────────
  if (body.action === "query") {
    const code = body.code ?? body.key_id ?? body.key ?? body.cardKey ?? body.token;

    if (!code || typeof code !== "string") {
      return NextResponse.json({ ok: false, error: "缺少 code（CDK 激活码）字段" }, { status: 400 });
    }

    const res = await getJson(
      `${EFUN_BASE_URL}/cards/query/${encodeURIComponent(code)}`,
      efunHeaders()
    ).catch((e) => ({ ok: false, status: 500, data: { error: String(e) } }));

    const d = res.data ?? {};

    if (d.success === true && d.data) {
      return NextResponse.json({
        ok: true,
        card: {
          cardId:      d.data.cardId,
          cardNumber:  d.data.cardNumber,
          expiry:      d.data.expiryDate,
          cvv:         d.data.cvv,
          status:      d.data.status,
          balance:     d.data.balance,
          createdAt:   d.data.createdAt,
        },
        meta: { httpStatus: res.status },
      });
    }

    return NextResponse.json({
      ok: false,
      error: d.message ?? d.error ?? "卡片查询失败",
      meta: { httpStatus: res.status },
    });
  }

  // ─────────────────────────────────────────────────────
  // 🔵 action = "billing"：EFun Card 账单查询
  // ─────────────────────────────────────────────────────
  if (body.action === "billing") {
    const code = body.code ?? body.key_id ?? body.key ?? body.cardKey ?? body.token;

    if (!code || typeof code !== "string") {
      return NextResponse.json({ ok: false, error: "缺少 code（CDK 激活码）字段" }, { status: 400 });
    }

    const res = await getJson(
      `${EFUN_BASE_URL}/billing/${encodeURIComponent(code)}`,
      efunHeaders()
    ).catch((e) => ({ ok: false, status: 500, data: { error: String(e) } }));

    const d = res.data ?? {};

    if (d.success === true && d.data) {
      return NextResponse.json({
        ok: true,
        billing: {
          cardId:           d.data.cardId,
          code:             d.data.code,
          transactions:     d.data.transactions ?? [],
          totalSpent:       d.data.totalSpent,
          remainingBalance: d.data.remainingBalance,
        },
        meta: { httpStatus: res.status },
      });
    }

    return NextResponse.json({
      ok: false,
      error: d.message ?? d.error ?? "账单查询失败",
      meta: { httpStatus: res.status },
    });
  }

  // ─────────────────────────────────────────────────────
  // 🔵 action = "cancel"：EFun Card 销卡
  // ─────────────────────────────────────────────────────
  if (body.action === "cancel") {
    const code = body.code ?? body.key_id ?? body.key ?? body.cardKey ?? body.token;

    if (!code || typeof code !== "string") {
      return NextResponse.json({ ok: false, error: "缺少 code（CDK 激活码）字段" }, { status: 400 });
    }

    const res = await postJson(
      EFUN_CANCEL_URL,
      { code },
      efunHeaders()
    ).catch((e) => ({ ok: false, status: 500, data: { error: String(e) } }));

    const d = res.data ?? {};

    if (d.success === true) {
      return NextResponse.json({
        ok: true,
        result: {
          cardId:       d.data?.cardId,
          code:         d.data?.code,
          status:       d.data?.status,
          refundAmount: d.data?.refundAmount,
          cancelledAt:  d.data?.cancelledAt,
        },
        meta: { httpStatus: res.status },
      });
    }

    return NextResponse.json({
      ok: false,
      error: d.message ?? d.error ?? "销卡失败",
      meta: { httpStatus: res.status },
    });
  }

  // ─────────────────────────────────────────────────────
  // 默认路由：开卡激活（ActCard 或 EFun Card）
  // ─────────────────────────────────────────────────────
  const keyId =
    body.key_id ??
    body.key    ??
    body.code   ??
    body.cardKey ??
    body.token;

  if (!keyId || typeof keyId !== "string") {
    return NextResponse.json({ ok: false, error: "缺少 key_id（卡密）字段" }, { status: 400 });
  }

  // 路由判断：CDK- 前缀走 EFun Card，其余走 ActCard
  const isEFun = keyId.toUpperCase().startsWith("CDK-");

  let card: any     = undefined;
  let ok            = false;
  let error: string | undefined = undefined;
  let activatedAt   = startedAt;
  let meta: any     = {};

  if (isEFun) {
    // ===========================
    // 🟢 EFun Card 开卡逻辑
    // ===========================

    const efunRes = await postJson(
      EFUN_REDEEM_URL,
      { code: keyId },
      efunHeaders()
    ).catch((e) => ({ ok: false, status: 500, data: { error: String(e) } }));

    meta = { efunStatus: efunRes.status };
    const d = efunRes.data ?? {};
    const success = d.success === true;

    if (success && d.data) {
      const raw = d.data;
      card = {
        cardId:      raw.cardId,
        cardNumber:  raw.cardNumber ? String(raw.cardNumber) : undefined,
        cvv:         raw.cvv        ? String(raw.cvv)        : undefined,
        // EFun 返回格式为 "MM/YY"，直接透传
        expiry:      raw.expiryDate ?? undefined,
        status:      raw.status,
        createdAt:   raw.createdAt,
        // EFun 卡片默认有效期为卡片本身到期，不需要 validMinutes
        validMinutes: undefined,
      };
      ok          = true;
      activatedAt = raw.createdAt ?? startedAt;
    } else {
      error = d.message ?? d.error ?? "EFun Card 激活失败，请检查卡密";
    }

  } else {
    // ===========================
    // 🔴 ActCard 处理逻辑（保持原有不变）
    // ===========================

    const payload = { ...body, key_id: keyId };

    // 1) 先 redeem
    const redeem = await postJson(ACT_REDEEM_URL, payload).catch((e) => ({
      ok: false, status: 500, data: { error: String(e) },
    }));

    // 2) 再 query
    const query = await postJson(ACT_QUERY_URL, payload).catch((e) => ({
      ok: false, status: 500, data: { error: String(e) },
    }));

    meta = { redeemStatus: redeem.status, queryStatus: query.status };

    const q       = query.data  || {};
    const r       = redeem.data || {};
    const success = (q?.success === true) || (r?.success === true);
    const cardRaw = q?.card ?? r?.card;

    if (cardRaw) {
      card = {
        cardNumber: cardRaw.pan ? String(cardRaw.pan) : undefined,
        cvv:        cardRaw.cvv ? String(cardRaw.cvv) : undefined,
        expiry:
          cardRaw.exp_month && cardRaw.exp_year
            ? `${String(cardRaw.exp_month).padStart(2, "0")}/${cardRaw.exp_year}`
            : undefined,
        validMinutes:
          typeof (q?.expire_minutes ?? r?.expire_minutes) !== "undefined"
            ? Number(q?.expire_minutes ?? r?.expire_minutes)
            : undefined,
        expireTime: cardRaw.expire_time ? String(cardRaw.expire_time) : undefined,
      };
      activatedAt = q?.used_time ?? r?.used_time ?? startedAt;
    }

    ok    = Boolean(success && (card?.cardNumber || card?.cvv));
    error = ok
      ? undefined
      : (q?.error || q?.message || r?.error || r?.message || "激活/查询失败，请检查卡密是否正确");
  }

  return NextResponse.json({
    ok,
    error,
    activatedAt,
    card,
    meta,
  });
}
