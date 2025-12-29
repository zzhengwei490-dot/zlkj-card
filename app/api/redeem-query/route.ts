import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// --- 1. 原有接口配置 (Mercury) ---
const MERCURY_REDEEM_URL = "https://mercury.wxie.de/api/keys/redeem";
const MERCURY_QUERY_URL = "https://mercury.wxie.de/api/keys/query";

// --- 2. 新增接口配置 (SX开头) ---
const SX_API_BASE = "https://card.zhucn.org/api/card";

// 辅助函数：通用 POST 请求 (用于旧接口)
async function postJson(url: string, payload: any, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

// 辅助函数：计算两个时间的分钟差 (用于新接口计算 validMinutes)
function calculateMinutes(startStr?: string, endStr?: string) {
  if (!startStr || !endStr) return 60; // 默认 60 分钟
  try {
    const start = new Date(startStr).getTime();
    const end = new Date(endStr).getTime();
    if (isNaN(start) || isNaN(end)) return 60;
    const diff = Math.floor((end - start) / 1000 / 60);
    return diff > 0 ? diff : 60;
  } catch {
    return 60;
  }
}

// --- 核心入口 ---
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

  const cleanKey = keyId.trim();

  // =========================================================
  // 分支 1：处理 "SX-" 开头的新卡密 (card.zhucn.org)
  // =========================================================
  if (cleanKey.toUpperCase().startsWith("SX-")) {
    try {
      // 拼接 URL: https://card.zhucn.org/api/card/{Key}
      const targetUrl = `${SX_API_BASE}/${cleanKey}`;
      
      const res = await fetch(targetUrl, {
        method: "GET",
        headers: {
          // 模拟浏览器 UA，防止被拦截
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json"
        },
        cache: "no-store",
      });

      const json = await res.json();
      
      // 接口返回结构是 { result: { ... }, ... }
      const result = json?.result;

      if (!res.ok || !result || result.error) {
        return NextResponse.json({
          ok: false,
          error: result?.msg || result?.error || "未查询到该 SX 卡密信息或状态异常",
        });
      }

      // 映射数据到前端统一格式
      const card = {
        cardNumber: result.card_number ? String(result.card_number) : undefined,
        cvv: result.card_cvc ? String(result.card_cvc) : undefined,
        // 接口直接返回 "12/2031" 格式
        expiry: result.card_exp_date ? String(result.card_exp_date) : undefined,
        // 自动计算有效期时长 (删除时间 - 激活时间)
        validMinutes: calculateMinutes(result.card_activation_time, result.delete_date),
        // 激活时间
        redeemTime: result.card_activation_time,
      };

      return NextResponse.json({
        ok: true,
        activatedAt: card.redeemTime || startedAt,
        error: null,
        card,
        meta: { source: "zhucn" } // 调试标记
      });

    } catch (e: any) {
      return NextResponse.json({
        ok: false,
        error: "新接口请求异常: " + String(e.message || e),
      });
    }
  }

  // =========================================================
  // 分支 2：处理原有 UUID 格式 (mercury.wxie.de)
  // =========================================================
  
  const payload = { ...body, key_id: cleanKey };

  // 1) 先 redeem
  const redeem = await postJson(MERCURY_REDEEM_URL, payload).catch((e) => ({
    ok: false,
    status: 500,
    data: { error: String(e) },
  }));

  // 2) 再 query
  const query = await postJson(MERCURY_QUERY_URL, payload).catch((e) => ({
    ok: false,
    status: 500,
    data: { error: String(e) },
  }));

  const q = query.data || {};
  const r = redeem.data || {};

  const success = (q?.success === true) || (r?.success === true);
  const cardRaw = q?.card ?? r?.card;
  
  const card = cardRaw
    ? {
        cardNumber: cardRaw?.pan ? String(cardRaw.pan) : undefined,
        cvv: cardRaw?.cvv ? String(cardRaw.cvv) : undefined,
        expiry:
          cardRaw?.exp_month && cardRaw?.exp_year
            ? `${String(cardRaw.exp_month).padStart(2, "0")}/${cardRaw.exp_year}`
            : undefined,
        validMinutes:
          typeof (q?.expire_minutes ?? r?.expire_minutes) !== "undefined"
            ? Number(q?.expire_minutes ?? r?.expire_minutes)
            : undefined,
        expireTime: cardRaw?.expire_time ? String(cardRaw.expire_time) : undefined,
        // 补充 redeemTime 字段，确保前端高亮显示
        redeemTime: q?.used_time ?? r?.used_time
      }
    : undefined;

  const activatedAt = q?.used_time ?? r?.used_time ?? startedAt;
  const ok = Boolean(success && (card?.cardNumber || card?.cvv));
  const error =
    ok
      ? undefined
      : (q?.error || q?.message || r?.error || r?.message || "激活/查询失败，请检查卡密是否正确");

  return NextResponse.json({
    ok,
    error,
    activatedAt,
    card,
    meta: { source: "mercury", redeemStatus: redeem.status, queryStatus: query.status },
  });
}
