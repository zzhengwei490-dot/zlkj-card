import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // 禁用缓存，避免拿到旧数据

const REDEEM_URL = "https://mercury.wxie.de/api/keys/redeem";
const QUERY_URL = "https://mercury.wxie.de/api/keys/query";

type AnyObj = Record<string, any>;

function getByPath(obj: any, path: string) {
  return path.split(".").reduce((acc, k) => (acc ? acc[k] : undefined), obj);
}

function pickFirst(obj: any, paths: string[]) {
  for (const p of paths) {
    const v = getByPath(obj, p);
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}

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

function extractCard(raw: any) {
  if (!raw) return null;

  const candidates = [
    raw,
    raw?.data,
    raw?.result,
    raw?.data?.data,
    raw?.data?.result,
    raw?.card,
    raw?.data?.card,
  ].filter(Boolean);

  const get = (paths: string[]) => {
    for (const c of candidates) {
      const v = pickFirst(c, paths);
      if (v !== undefined && v !== null && v !== "") return v;
    }
    return undefined;
  };

  const cardNumber = get(["cardNumber", "card_number", "number", "card.number"]);
  const cvv = get(["cvv", "cvc", "card.cvv", "card.cvc"]);
  const expMonth = get(["expMonth", "exp_month", "card.expMonth", "card.exp_month"]);
  const expYear = get(["expYear", "exp_year", "card.expYear", "card.exp_year"]);
  const expiry = get(["expiry", "expires", "exp", "valid_thru"]);
  const validMinutes = get(["validMinutes", "valid_minutes", "ttl_minutes", "ttl", "duration_minutes"]);
  const redeemTime = get([
    "redeemTime",
    "redeem_time",
    "redeemedAt",
    "redeemed_at",
    "activationTime",
    "activation_time",
    "createdAt",
    "created_at",
  ]);

  let expiryText: string | undefined = expiry ? String(expiry) : undefined;
  if (!expiryText && expMonth && expYear) {
    expiryText = `${String(expMonth).padStart(2, "0")}/${expYear}`;
  }

  const minutesNum = validMinutes !== undefined ? Number(validMinutes) : undefined;
  const validMinutesNum = Number.isFinite(minutesNum as number) ? (minutesNum as number) : undefined;

  return {
    cardNumber: cardNumber ? String(cardNumber) : undefined,
    cvv: cvv ? String(cvv) : undefined,
    expiry: expiryText,
    validMinutes: validMinutesNum,
    redeemTime: redeemTime ? String(redeemTime) : undefined,
  };
}

export async function POST(request: Request) {
  const startedAt = new Date().toISOString();

  let body: AnyObj = {};
  try {
    body = (await request.json()) ?? {};
  } catch {
    return NextResponse.json({ ok: false, error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const key = body.key ?? body.code ?? body.cardKey ?? body.token;
  if (!key || typeof key !== "string") {
    return NextResponse.json({ ok: false, error: "缺少 key（卡密）字段" }, { status: 400 });
  }

  // 兼容不同字段名：同时发送 key 和 code（上游接受哪个都行）
  const payload = { ...body, key, code: key };

  // 1) 先激活/兑换（失败也继续走查询）
  const redeem = await postJson(REDEEM_URL, payload).catch((e) => ({
    ok: false,
    status: 500,
    data: { error: String(e) },
  }));

  // 2) 再查询
  const query = await postJson(QUERY_URL, payload).catch((e) => ({
    ok: false,
    status: 500,
    data: { error: String(e) },
  }));

  // 优先用 query 的数据（更像最终状态），query 没有再用 redeem 的
  const card = extractCard(query.data) ?? extractCard(redeem.data);

  const activatedAt =
    card?.redeemTime ??
    pickFirst(query.data, ["redeemTime", "redeem_time", "redeemedAt", "redeemed_at"]) ??
    pickFirst(redeem.data, ["redeemTime", "redeem_time", "redeemedAt", "redeemed_at"]) ??
    startedAt;

  const ok = Boolean(card?.cardNumber || card?.cvv) && (query.ok || redeem.ok);

  return NextResponse.json({
    ok,
    activatedAt,
    card,
    meta: {
      redeemStatus: redeem.status,
      queryStatus: query.status,
    },
  });
}
