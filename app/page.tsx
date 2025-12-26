"use client";

import { useMemo, useState } from "react";

type ApiResp = {
  ok: boolean;
  activatedAt?: string;
  error?: string;
  card?: {
    cardNumber?: string;
    cvv?: string;
    expiry?: string;
    validMinutes?: number;
    redeemTime?: string;
  };
};

function formatCardNumber(num: string) {
  const digits = num.replace(/\s+/g, "");
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

function formatTime(input?: string) {
  if (!input) return "--";
  const d = new Date(input);
  if (!Number.isFinite(d.getTime())) return input; // 解析失败就原样显示（比如 2025/12/26 11:32:50）
  return d.toLocaleString("zh-CN", { hour12: false });
}

export default function Home() {
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resp, setResp] = useState<ApiResp | null>(null);

  const activatedAtText = useMemo(() => {
    const t = resp?.card?.redeemTime || resp?.activatedAt;
    return formatTime(t);
  }, [resp]);

  const onRedeemAndQuery = async () => {
    const k = key.trim();
    if (!k) {
      setError("请输入卡密");
      return;
    }

    setLoading(true);
    setError(null);
    setResp(null);

    try {
      const res = await fetch("/api/redeem-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key_id: k }),
      });
      const json = (await res.json()) as ApiResp;

      if (!json.ok) {
        setError(json.error || "激活/查询失败，请检查卡密是否正确");
      }
      setResp(json);
    } catch (e: any) {
      setError(e?.message || "网络异常，请稍后再试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[#0b1220]">
      <div className="w-full max-w-md rounded-2xl bg-white/5 border border-white/10 backdrop-blur p-6">
        <h1 className="text-center text-2xl font-semibold text-white">Mercury 虚拟卡</h1>
        <p className="text-center text-sm text-white/60 mt-2">输入卡密兑换或查询虚拟信用卡</p>

        <input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onRedeemAndQuery()}
          placeholder="请输入卡密（UUID）"
          className="mt-6 w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 text-white outline-none focus:border-white/30"
        />

        <button
          onClick={onRedeemAndQuery}
          disabled={loading}
          className="mt-4 w-full rounded-xl px-4 py-3 font-medium text-white bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 disabled:hover:bg-emerald-500"
        >
          {loading ? "处理中..." : "兑换/查询"}
        </button>

        {error ? <div className="mt-4 text-sm text-red-400">{error}</div> : null}

        {resp?.card ? (
          <div className="mt-6 rounded-xl bg-black/25 border border-white/10 p-4">
            <div className="flex items-center justify-center gap-2 text-emerald-400 font-medium">
              <span>✓</span>
              <span>查询结果</span>
            </div>

            <div className="mt-4 text-center text-2xl tracking-widest font-semibold text-white">
              {resp.card.cardNumber ? formatCardNumber(resp.card.cardNumber) : "—"}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm text-white">
              <div className="rounded-lg bg-white/5 p-3">
                <div className="text-white/50">CVV</div>
                <div className="mt-1 font-semibold">{resp.card.cvv || "—"}</div>
              </div>
              <div className="rounded-lg bg-white/5 p-3">
                <div className="text-white/50">有效期</div>
                <div className="mt-1 font-semibold">{resp.card.expiry || "—"}</div>
              </div>
              <div className="rounded-lg bg-white/5 p-3">
                <div className="text-white/50">有效时间</div>
                <div className="mt-1 font-semibold">
                  {resp.card.validMinutes != null ? `${resp.card.validMinutes} 分钟` : "—"}
                </div>
              </div>
            </div>

            <div className="mt-4 text-center text-xs text-white/60">
              激活时间：{activatedAtText}
            </div>
          </div>
        ) : null}

        <div className="mt-6 text-center text-xs text-white/40">请妥善保管您的卡片信息 · v0.6.2</div>
      </div>
    </main>
  );
}
