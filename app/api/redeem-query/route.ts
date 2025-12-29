import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const REDEEM_URL = "https://mercury.wxie.de/api/keys/redeem";
const QUERY_URL = "https://mercury.wxie.de/api/keys/query";

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

export async function POST(request: Request) {
  const startedAt = new Date().toISOString();

  let body: Record<string, any> = {};
  try {
    body = (await request.json()) ?? {};
  } catch {
    return NextResponse.json({ ok: false, error: "请求体不是合法 JSON" }, { status: 400 });
  }

  // ✅ 关键：上游要的是 key_id
  const keyId =
    body.key_id ??
    body.key ??
    body.code ??
    body.cardKey ??
    body.token;

  if (!keyId || typeof keyId !== "string") {
    return NextResponse.json({ ok: false, error: "缺少 key_id（卡密）字段" }, { status: 400 });
  }

  const payload = { ...body, key_id: keyId };

  // 1) 先 redeem（失败也继续 query，兼容“已兑换过”的卡密）
  const redeem = await postJson(REDEEM_URL, payload).catch((e) => ({
    ok: false,
    status: 500,
    data: { error: String(e) },
  }));

  // 2) 再 query
  const query = await postJson(QUERY_URL, payload).catch((e) => ({
    ok: false,
    status: 500,
    data: { error: String(e) },
  }));

  // ✅ 以 query 为准（更像最终状态）
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
        // 可选：到期时间（如果你想显示）
        expireTime: cardRaw?.expire_time ? String(cardRaw.expire_time) : undefined,
      }
    : undefined;

  // ✅ 你要的“激活时间”：上游字段 used_time
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
    meta: { redeemStatus: redeem.status, queryStatus: query.status },
  });
}
