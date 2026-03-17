import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// 🔴 原有接口：ActCard
const ACT_REDEEM_URL = "https://actcard.xyz/api/keys/redeem";
const ACT_QUERY_URL  = "https://actcard.xyz/api/keys/query";

// 🟢 EFun Card 接口
const EFUN_BASE_URL   = "https://card.efuncard.com/api/external";
const EFUN_REDEEM_URL = `${EFUN_BASE_URL}/redeem`;
const EFUN_CANCEL_URL = `${EFUN_BASE_URL}/cards/cancel`;
const EFUN_3DS_URL    = `${EFUN_BASE_URL}/3ds/verify`;
// GET 接口：
//   查询卡片: GET ${EFUN_BASE_URL}/cards/query/:code
//   账单查询: GET ${EFUN_BASE_URL}/billing/:code

const EFUN_API_KEY = "b352d13f20462ed46cff0aa417065496bd811eb8396b2e2fee11aeacb796fc00";

// ─────────────────────────────────────────────────────
// 工具函数
// ─────────────────────────────────────────────────────
async function postJson(
  url: string,
  payload: any,
  headers: Record<string, string> = {},
  timeoutMs = 15000
) {
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

async function getJson(
  url: string,
  headers: Record<string, string> = {},
  timeoutMs = 15000
) {
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

const efunHeaders = () => ({
  Authorization: `Bearer ${EFUN_API_KEY}`,
});

// ─────────────────────────────────────────────────────
// 判断是否为 EFun 卡（UK- 前缀）
// ─────────────────────────────────────────────────────
function isEFunKey(key: string) {
  return key.toUpperCase().startsWith("UK-");
}

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

  // 通用获取 code 的辅助
  const extractCode = () =>
    body.code ?? body.key_id ?? body.key ?? body.cardKey ?? body.token;

  // ─────────────────────────────────────────────────────
  // 🔵 action = "3ds"：3DS 验证码查询（仅 EFun 卡支持）
  // ─────────────────────────────────────────────────────
  if (body.action === "3ds") {
    const code = extractCode();
    if (!code || typeof code !== "string") {
      return NextResponse.json({ ok: false, error: "缺少 code 字段" }, { status: 400 });
    }
    const minutes = typeof body.minutes === "number" ? body.minutes : 30;

    const res = await postJson(EFUN_3DS_URL, { code, minutes }, efunHeaders()).catch((e) => ({
      ok: false, status: 500, data: { error: String(e) },
    }));
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
  // 🔵 action = "query"：查询卡片信息（EFun 卡）
  // ─────────────────────────────────────────────────────
  if (body.action === "query") {
    const code = extractCode();
    if (!code || typeof code !== "string") {
      return NextResponse.json({ ok: false, error: "缺少 code 字段" }, { status: 400 });
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
          cardId:     d.data.cardId,
          cardNumber: d.data.cardNumber,
          expiry:     d.data.expiryDate,
          cvv:        d.data.cvv,
          status:     d.data.status,
          balance:    d.data.balance,
          createdAt:  d.data.createdAt,
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
  // 🔵 action = "billing"：账单查询
  // ─────────────────────────────────────────────────────
  if (body.action === "billing") {
    const code = extractCode();
    if (!code || typeof code !== "string") {
      return NextResponse.json({ ok: false, error: "缺少 code 字段" }, { status: 400 });
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
  // 🔵 action = "cancel"：销卡
  // ─────────────────────────────────────────────────────
  if (body.action === "cancel") {
    const code = extractCode();
    if (!code || typeof code !== "string") {
      return NextResponse.json({ ok: false, error: "缺少 code 字段" }, { status: 400 });
    }

    const res = await postJson(EFUN_CANCEL_URL, { code }, efunHeaders()).catch((e) => ({
      ok: false, status: 500, data: { error: String(e) },
    }));
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
  // 默认路由：开卡激活
  // UK- 前缀 → EFun Card    其余 → ActCard
  // ─────────────────────────────────────────────────────
  const keyId = extractCode();

  if (!keyId || typeof keyId !== "string") {
    return NextResponse.json({ ok: false, error: "缺少 key_id（卡密）字段" }, { status: 400 });
  }

  let card: any     = undefined;
  let ok            = false;
  let error: string | undefined = undefined;
  let activatedAt   = startedAt;
  let meta: any     = {};

  if (isEFunKey(keyId)) {
    // ===========================
    // 🟢 EFun Card 开卡逻辑（UK- 前缀）
    // 策略：先 redeem，若失败（卡已激活/409）则自动 fallback 到 query
    // ===========================
    const efunRes = await postJson(
      EFUN_REDEEM_URL,
      { code: keyId },
      efunHeaders()
    ).catch((e) => ({ ok: false, status: 500, data: { error: String(e) } }));

    meta = { efunRedeemStatus: efunRes.status };

    // 判断 redeem 是否成功
    const redeemData = efunRes.data ?? {};
    const redeemSuccess = redeemData.success === true && redeemData.data;

    // 若 redeem 失败（已使用/409/任何错误），自动 fallback 到 GET query 接口
    let raw: any = redeemSuccess ? redeemData.data : null;

    if (!raw) {
      // fallback：通过 query 接口获取已激活的卡片信息
      const queryRes = await getJson(
        `${EFUN_BASE_URL}/cards/query/${encodeURIComponent(keyId)}`,
        efunHeaders()
      ).catch((e) => ({ ok: false, status: 500, data: { error: String(e) } }));

      meta.efunQueryStatus = queryRes.status;
      const queryData = queryRes.data ?? {};

      if (queryData.success === true && queryData.data) {
        raw = queryData.data;
      } else {
        // redeem 和 query 都失败，返回错误
        error =
          queryData.message ?? queryData.error ??
          redeemData.message ?? redeemData.error ??
          "卡密不存在或无法查询，请检查后重试";
      }
    }

    if (raw) {
      card = {
        cardId:       raw.cardId,
        cardNumber:   raw.cardNumber   ? String(raw.cardNumber)   : undefined,
        cvv:          raw.cvv          ? String(raw.cvv)          : undefined,
        expiry:       raw.expiryDate   ?? undefined,
        status:       raw.status,
        balance:      raw.balance,
        createdAt:    raw.createdAt,
        validMinutes: undefined,
        redeemCode:   keyId,
      };
      ok          = true;
      activatedAt = raw.createdAt ?? startedAt;
    }

  } else {
    // ===========================
    // 🔴 ActCard 处理逻辑（保持原有不变）
    // ===========================
    const payload = { ...body, key_id: keyId };

    const redeem = await postJson(ACT_REDEEM_URL, payload).catch((e) => ({
      ok: false, status: 500, data: { error: String(e) },
    }));
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
        redeemCode: keyId,
      };
      activatedAt = q?.used_time ?? r?.used_time ?? startedAt;
    }

    ok    = Boolean(success && (card?.cardNumber || card?.cvv));
    error = ok
      ? undefined
      : (q?.error || q?.message || r?.error || r?.message || "激活/查询失败，请检查卡密是否正确");
  }

  return NextResponse.json({ ok, error, activatedAt, card, meta });
}
