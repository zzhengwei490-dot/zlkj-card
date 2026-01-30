import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// 🔴 原有接口：ActCard
const ACT_REDEEM_URL = "https://actcard.xyz/api/keys/redeem";
const ACT_QUERY_URL = "https://actcard.xyz/api/keys/query";

// 🟢 新增接口：HolyMasterCard (根据提供的截图)
const HOLY_ACTIVATE_URL = "http://holymastercard.com/api/license/activate";

async function postJson(url: string, payload: any, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // 伪装浏览器 UA
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: controller.signal,
    });

    const text = await res.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }

    return { ok: res.ok, status: res.status, data };
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(request: Request) {
  const startedAt = new Date().toISOString();

  let body: Record<string, any> = {};
  try {
    body = (await request.json()) ?? {};
  } catch {
    return NextResponse.json({ ok: false, error: "请求体不是合法 JSON" }, { status: 400 });
  }

  // 获取卡密
  const keyId =
    body.key_id ??
    body.key ??
    body.code ??
    body.cardKey ??
    body.token;

  if (!keyId || typeof keyId !== "string") {
    return NextResponse.json({ ok: false, error: "缺少 key_id（卡密）字段" }, { status: 400 });
  }

  // 🔄 路由判断逻辑
  // 如果卡密以 AWCC 或 EWCC 开头，走 HolyMaster 接口，否则走 ActCard
  const isHolyMaster = keyId.toUpperCase().startsWith("AWCC") || keyId.toUpperCase().startsWith("EWCC");

  let card: any = undefined;
  let ok = false;
  let error: string | undefined = undefined;
  let activatedAt = startedAt;
  let meta: any = {};

  if (isHolyMaster) {
    // ===========================
    // 🟢 HolyMaster 处理逻辑
    // ===========================
    
    // HolyMaster 只需要一个 activate 接口，通常也是幂等的（已激活会返回详情）
    const holyRes = await postJson(HOLY_ACTIVATE_URL, { licenseKey: keyId }).catch((e) => ({
        ok: false,
        status: 500,
        data: { error: String(e) },
    }));

    meta = { holyStatus: holyRes.status };
    const hData = holyRes.data || {};
    
    // 判断成功：success 为 true 且有 card 对象
    const success = hData.success === true;

    if (success && hData.card) {
        const raw = hData.card;
        card = {
            cardNumber: raw.cardNumber, // 字段名直接对应
            cvv: raw.cvv,
            // 格式化有效期：MM/YYYY
            expiry: raw.expiryMonth && raw.expiryYear 
                ? `${String(raw.expiryMonth).padStart(2, "0")}/${raw.expiryYear}` 
                : undefined,
            // 映射其他可选字段
            expireTime: hData.expiresAt, // ISO 时间字符串
            status: hData.licenseStatus
        };
        ok = true;
        // 如果接口返回了激活时间则使用，否则用当前时间
        if (hData.activatedAt) activatedAt = hData.activatedAt;
    } else {
        error = hData.message || hData.error || "HolyMaster 激活失败，请检查卡密";
    }

  } else {
    // ===========================
    // 🔴 ActCard 处理逻辑 (保持原有)
    // ===========================

    const payload = { ...body, key_id: keyId };

    // 1) 先 redeem
    const redeem = await postJson(ACT_REDEEM_URL, payload).catch((e) => ({
      ok: false,
      status: 500,
      data: { error: String(e) },
    }));

    // 2) 再 query
    const query = await postJson(ACT_QUERY_URL, payload).catch((e) => ({
      ok: false,
      status: 500,
      data: { error: String(e) },
    }));

    meta = { redeemStatus: redeem.status, queryStatus: query.status };

    const q = query.data || {};
    const r = redeem.data || {};
    const success = (q?.success === true) || (r?.success === true);
    const cardRaw = q?.card ?? r?.card;

    if (cardRaw) {
        card = {
            cardNumber: cardRaw.pan ? String(cardRaw.pan) : undefined,
            cvv: cardRaw.cvv ? String(cardRaw.cvv) : undefined,
            expiry: cardRaw.exp_month && cardRaw.exp_year
                ? `${String(cardRaw.exp_month).padStart(2, "0")}/${cardRaw.exp_year}`
                : undefined,
            validMinutes: typeof (q?.expire_minutes ?? r?.expire_minutes) !== "undefined"
                ? Number(q?.expire_minutes ?? r?.expire_minutes)
                : undefined,
            expireTime: cardRaw.expire_time ? String(cardRaw.expire_time) : undefined,
        };
        activatedAt = q?.used_time ?? r?.used_time ?? startedAt;
    }

    ok = Boolean(success && (card?.cardNumber || card?.cvv));
    error = ok ? undefined : (q?.error || q?.message || r?.error || r?.message || "激活/查询失败，请检查卡密是否正确");
  }

  return NextResponse.json({
    ok,
    error,
    activatedAt,
    card,
    meta,
  });
}
