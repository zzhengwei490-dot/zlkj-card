import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// --- 配置区域 ---
const MERCURY_REDEEM_URL = "https://mercury.wxie.de/api/keys/redeem";
const MERCURY_QUERY_URL = "https://mercury.wxie.de/api/keys/query";
const SX_API_BASE = "https://card.zhucn.org/api/card";

// --- 辅助函数 ---

// 1. 通用 POST 请求 (用于旧接口 Mercury)
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

// 2. 计算剩余时间 (分钟)
function calculateMinutes(startStr?: string, endStr?: string) {
  if (!startStr || !endStr) return 60;
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

// 3. 格式化有效期 (参考你的逻辑: 12/2031 -> 12/31)
function formatExpiry(raw?: string) {
  if (!raw) return undefined;
  // 如果已经是 12/31 格式不用动，如果是 12/2031 则处理
  if (raw.includes('/')) {
    const parts = raw.split('/'); // ["12", "2031"]
    if (parts.length === 2 && parts[1].length === 4) {
      return `${parts[0]}/${parts[1].slice(-2)}`; // "12/31"
    }
  }
  return raw;
}

// --- 主入口 ---
export async function POST(request: Request) {
  const startedAt = new Date().toISOString();

  let body: Record<string, any> = {};
  try {
    body = (await request.json()) ?? {};
  } catch {
    return NextResponse.json({ ok: false, error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const keyId = body.key_id ?? body.key ?? body.code ?? body.cardKey ?? body.token;
  if (!keyId || typeof keyId !== "string") {
    return NextResponse.json({ ok: false, error: "缺少 key_id 字段" }, { status: 400 });
  }

  const cleanKey = keyId.trim();

  // =========================================================
  // ▶️ 分支 1：处理 "SX-" 开头的新卡密 (Zhucn)
  // =========================================================
  if (cleanKey.toUpperCase().startsWith("SX-")) {
    try {
      const targetUrl = `${SX_API_BASE}/${encodeURIComponent(cleanKey)}`;
      
      // ⚠️ 关键修复：添加完整的浏览器伪装头，防止返回 HTML 报错
      const res = await fetch(targetUrl, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Accept": "application/json, text/plain, */*",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
          "Referer": "https://card.zhucn.org/", // 必带，告诉对方我是从官网来的
          "Origin": "https://card.zhucn.org",
          "Cache-Control": "no-cache",
          "Pragma": "no-cache"
        },
        cache: "no-store",
      });

      // 先获取文本，防止 JSON 解析直接崩掉
      const text = await res.text();
      
      // 🛑 检查是否返回了 HTML (Cloudflare 拦截页面通常是 HTML)
      if (text.trim().startsWith("<")) {
        console.error("Zhucn API blocked response:", text.substring(0, 100));
        return NextResponse.json({ 
          ok: false, 
          error: "上游接口防火墙拦截 (WAF Blocked)，请稍后重试或联系管理员" 
        });
      }

      let json;
      try {
        json = JSON.parse(text);
      } catch (e) {
        return NextResponse.json({ ok: false, error: "上游接口返回数据格式错误" });
      }

      // 根据你截图和代码逻辑，数据在 result 字段里
      const result = json?.result;

      if (!result || result.error) {
        // 部分接口可能用 msg 或 error 字段
        const errMsg = result?.msg || result?.error || json?.msg || "未查询到该卡密信息";
        return NextResponse.json({ ok: false, error: errMsg });
      }

      // 映射数据
      const card = {
        cardNumber: result.card_number ? String(result.card_number) : undefined,
        cvv: result.card_cvc ? String(result.card_cvc) : undefined,
        expiry: formatExpiry(result.card_exp_date), // 格式化日期 12/2031 -> 12/31
        validMinutes: calculateMinutes(result.card_activation_time, result.delete_date), // 自动计算时长
        redeemTime: result.card_activation_time, // 激活时间
      };

      if (!card.cardNumber) {
        return NextResponse.json({ ok: false, error: "卡密无效或已被使用 (无卡号)" });
      }

      return NextResponse.json({
        ok: true,
        activatedAt: card.redeemTime || startedAt,
        error: null,
        card,
        meta: { source: "zhucn" }
      });

    } catch (e: any) {
      console.error("Zhucn Request Error:", e);
      return NextResponse.json({
        ok: false,
        error: "请求新接口发生网络错误: " + String(e.message || e),
      });
    }
  }

  // =========================================================
  // ▶️ 分支 2：处理原有 UUID 格式 (Mercury)
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
  
  // 格式化 Mercury 的日期
  let expYear = String(cardRaw?.exp_year || '');
  if (expYear.length === 4) expYear = expYear.slice(-2);
  const formattedExpiry = cardRaw?.exp_month && expYear 
    ? `${String(cardRaw.exp_month).padStart(2, "0")}/${expYear}` 
    : undefined;

  const card = cardRaw
    ? {
        cardNumber: cardRaw?.pan ? String(cardRaw.pan) : undefined,
        cvv: cardRaw?.cvv ? String(cardRaw.cvv) : undefined,
        expiry: formattedExpiry,
        validMinutes:
          typeof (q?.expire_minutes ?? r?.expire_minutes) !== "undefined"
            ? Number(q?.expire_minutes ?? r?.expire_minutes)
            : undefined,
        expireTime: cardRaw?.expire_time ? String(cardRaw.expire_time) : undefined,
        redeemTime: q?.used_time ?? r?.used_time
      }
    : undefined;

  const activatedAt = q?.used_time ?? r?.used_time ?? startedAt;
  const ok = Boolean(success && (card?.cardNumber || card?.cvv));
  const error = ok
    ? undefined
    : (q?.error || q?.message || r?.error || r?.message || "激活/查询失败，请检查卡密是否正确");

  return NextResponse.json({
    ok,
    error,
    activatedAt,
    card,
    meta: { source: "mercury" },
  });
}
