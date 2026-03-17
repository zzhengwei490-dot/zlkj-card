"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";

// --- 1. 类型定义 ---
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
    redeemCode?: string;
    status?: string;
    balance?: number;
  };
};

type ThreeDSResp = {
  ok: boolean;
  error?: string;
  verifications?: Array<{
    otp: string;
    merchant: string;
    amount: string;
    receivedAt: string;
  }>;
};

// --- 2. 随机姓名库（英国风格）& 英国地址库 ---
const RANDOM_NAMES = [
  "Oliver Thompson", "Emily Clarke", "James Harrison", "Sophie Bennett",
  "William Turner", "Charlotte Davies", "Harry Wilson", "Amelia Evans",
  "George Baker", "Isla Morris", "Jack Robinson", "Poppy Phillips",
  "Thomas Wright", "Grace Campbell", "Alfie Stewart", "Lily Anderson",
  "Henry Mitchell", "Ella Roberts", "Noah Walker", "Mia Taylor",
];

const UK_ADDRESSES = [
  { street: "14 Victoria Street", city: "London", county: "Greater London", postcode: "SW1H 0ET", country: "GB" },
  { street: "7 Princes Street",   city: "Edinburgh",  county: "Scotland",        postcode: "EH2 2QP",  country: "GB" },
  { street: "22 King Street",     city: "Manchester", county: "Greater Manchester", postcode: "M2 4LQ", country: "GB" },
  { street: "5 High Street",      city: "Oxford",     county: "Oxfordshire",     postcode: "OX1 4BZ",  country: "GB" },
  { street: "31 Park Road",       city: "Birmingham", county: "West Midlands",   postcode: "B1 2AE",   country: "GB" },
  { street: "18 Broad Street",    city: "Bristol",    county: "Bristol",         postcode: "BS1 2HG",  country: "GB" },
  { street: "9 Castle Street",    city: "Cardiff",    county: "Wales",           postcode: "CF10 1BS", country: "GB" },
  { street: "3 Church Lane",      city: "Cambridge",  county: "Cambridgeshire",  postcode: "CB2 1TN",  country: "GB" },
];

// --- 3. 辅助函数与组件 ---
function formatTime(input?: string) {
  if (!input) return "--";
  const d = new Date(input);
  if (!Number.isFinite(d.getTime())) return input;
  return d.toLocaleString("zh-CN", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
}

const CopyIcon = () => (
  <svg className="w-3.5 h-3.5 text-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity ml-2 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const MastercardLogo = () => (
  <svg width="36" height="22" viewBox="0 0 48 30" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="15" cy="15" r="15" fill="#EB001B" fillOpacity="0.9"/>
    <circle cx="33" cy="15" r="15" fill="#F79E1B" fillOpacity="0.9"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M24 15C24 9.84545 26.6909 5.29091 30.8182 2.50909C28.8 1.09091 26.5091 0.272727 24 0.272727C21.4909 0.272727 19.2 1.09091 17.1818 2.50909C21.3091 5.29091 24 9.84545 24 15ZM24 15C24 20.1545 21.3091 24.7091 17.1818 27.4909C19.2 28.9091 21.4909 29.7273 24 29.7273C26.5091 29.7273 28.8 28.9091 30.8182 27.4909C26.6909 24.7091 24 20.1545 24 15Z" fill="#FF5F00" fillOpacity="0.85"/>
  </svg>
);

// 倒计时组件
function CountdownTimer({ startTime, validMinutes }: { startTime?: string; validMinutes?: number }) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!startTime) { setTimeLeft(null); return; }
    const startTs = new Date(startTime).getTime();
    if (isNaN(startTs)) { setTimeLeft(null); return; }
    const duration = (validMinutes ?? 60) * 60 * 1000;
    const endTs = startTs + duration;

    const calc = () => Math.max(endTs - Date.now(), 0);
    setTimeLeft(calc());
    const timer = setInterval(() => {
      const r = calc();
      setTimeLeft(r);
      if (r <= 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime, validMinutes]);

  if (timeLeft === null) return <span className="text-slate-200">--</span>;
  if (timeLeft <= 0) return <span className="text-red-400 font-medium">已过期</span>;
  const m = Math.floor(timeLeft / 60000);
  const s = Math.floor((timeLeft % 60000) / 1000);
  return (
    <span className="font-mono text-[#8292ff] font-medium tracking-wider text-sm sm:text-base">
      {m}分{s.toString().padStart(2, "0")}秒
    </span>
  );
}

// 3DS 弹窗组件
function ThreeDSModal({ onClose, code }: { onClose: () => void; code: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ThreeDSResp | null>(null);
  const [minutes, setMinutes] = useState(30);

  const fetch3DS = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/redeem-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "3ds", code, minutes }),
      });
      const json = await res.json();
      setResult(json);
    } catch (e: any) {
      setResult({ ok: false, error: e?.message || "网络请求失败" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch3DS(); }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      {/* 弹窗 */}
      <div className="relative w-full max-w-md bg-[#0a1628] border border-cyan-500/30 rounded-2xl shadow-[0_0_60px_rgba(6,182,212,0.15)] overflow-hidden">
        {/* 顶部渐变条 */}
        <div className="h-1 w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500" />
        
        <div className="p-6">
          {/* 标题 */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold text-base">3DS 验证码</h3>
                <p className="text-slate-400 text-xs">3D Secure 动态验证码查询</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-700/50 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 分钟选择 + 刷新 */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 flex items-center gap-2 bg-[#050b14]/80 border border-slate-700/50 rounded-xl px-3 py-2">
              <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <select
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
                className="flex-1 bg-transparent text-slate-200 text-sm outline-none cursor-pointer"
              >
                <option value={10}>最近 10 分钟</option>
                <option value={30}>最近 30 分钟</option>
                <option value={60}>最近 60 分钟</option>
              </select>
            </div>
            <button
              onClick={fetch3DS}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-sm font-medium hover:bg-cyan-500/20 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              刷新
            </button>
          </div>

          {/* 内容区 */}
          <div className="min-h-[140px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-36 gap-3">
                <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                <p className="text-slate-400 text-sm">正在查询验证码...</p>
              </div>
            ) : !result ? null : !result.ok ? (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
                <p className="text-red-400 text-sm">{result.error || "查询失败"}</p>
              </div>
            ) : !result.verifications?.length ? (
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 text-center">
                <div className="w-10 h-10 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <p className="text-slate-400 text-sm">暂无验证码</p>
                <p className="text-slate-600 text-xs mt-1">该时间段内未收到 3DS 验证请求</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                {result.verifications.map((v, i) => (
                  <div key={i} className="bg-[#050b14]/80 border border-cyan-500/20 rounded-xl p-4 group hover:border-cyan-500/40 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                        <span className="text-xs text-slate-400">{v.merchant}</span>
                        <span className="text-xs text-slate-500">·</span>
                        <span className="text-xs text-emerald-400">{v.amount}</span>
                      </div>
                      <span className="text-[10px] text-slate-500">{formatTime(v.receivedAt)}</span>
                    </div>
                    <div 
                      className="font-mono text-2xl font-bold text-white tracking-[0.3em] cursor-pointer hover:text-cyan-300 transition-colors"
                      onClick={() => navigator.clipboard.writeText(v.otp)}
                      title="点击复制验证码"
                    >
                      {v.otp}
                      <span className="text-xs text-cyan-500/60 ml-3 font-normal tracking-normal align-middle">复制</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-[10px] text-slate-600 text-center mt-4">
            3DS 验证码有效期通常为 5-10 分钟，请及时使用
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// 主页面
// ─────────────────────────────────────────────────────
export default function Home() {
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resp, setResp] = useState<ApiResp | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [show3DS, setShow3DS] = useState(false);
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState(UK_ADDRESSES[0]);

  useEffect(() => {
    setFullName(RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)]);
    setAddress(UK_ADDRESSES[Math.floor(Math.random() * UK_ADDRESSES.length)]);
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2200);
  };

  const handleCopy = (text: string | undefined, label: string) => {
    if (!text || text === "--") return;
    const toCopy = label === "卡号" ? text.replace(/\s+/g, "") : text;
    navigator.clipboard.writeText(toCopy)
      .then(() => showToast(`✓ 已复制 ${label}`))
      .catch(() => showToast("❌ 复制失败"));
  };

  const displayCardNumber = useMemo(() => {
    const num = resp?.card?.cardNumber || "";
    return num.replace(/\s+/g, "").replace(/(\d{4})(?=\d)/g, "$1 ").trim();
  }, [resp]);

  const onRedeemAndQuery = async () => {
    const k = key.trim();
    if (!k) { setError("请输入有效的卡密"); return; }
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
        showToast("激活或查询失败");
        setError(json.error || "请求失败，请检查卡密状态");
      } else {
        setResp(json);
        // 重新随机分配姓名和地址
        setFullName(RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)]);
        setAddress(UK_ADDRESSES[Math.floor(Math.random() * UK_ADDRESSES.length)]);
        showToast("✓ 卡片数据获取成功");
      }
    } catch (e: any) {
      showToast("网络连接异常");
      setError(e?.message || "网络请求异常，请稍后再试");
    } finally {
      setLoading(false);
    }
  };

  // 当前卡密（用于 3DS 查询）
  const currentCode = resp?.card?.redeemCode ?? key.trim();

  return (
    <div className="min-h-screen bg-[#060a14] text-slate-300 font-sans selection:bg-cyan-900/50 relative overflow-hidden">

      {/* 背景 */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none"
        style={{ backgroundImage: "linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Toast */}
      <div className={`fixed top-8 right-8 z-50 transition-all duration-300 transform ${toastMsg ? "translate-x-0 opacity-100" : "translate-x-10 opacity-0 pointer-events-none"}`}>
        <div className="bg-[#0f172a]/90 backdrop-blur-md text-emerald-400 px-6 py-3 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.2)] font-medium text-sm border border-emerald-500/30">
          {toastMsg}
        </div>
      </div>

      {/* 3DS 弹窗 */}
      {show3DS && currentCode && (
        <ThreeDSModal code={currentCode} onClose={() => setShow3DS(false)} />
      )}

      <div className="max-w-[1400px] mx-auto h-full p-4 md:p-6 lg:p-8 relative z-10 flex flex-col lg:h-screen">

        {/* Header */}
        <header className="flex justify-between items-center mb-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 relative rounded-lg overflow-hidden flex-shrink-0 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <Image src="/logo.jpg" alt="Logo" fill className="object-cover" />
            </div>
            <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-wide">
              智链科技虚拟卡
            </h1>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="hidden md:block text-right">
              <p className="text-slate-400 text-xs">Welcome,</p>
              <p className="text-white font-medium">User</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center text-white font-bold border border-cyan-400/30 shadow-lg cursor-pointer hover:opacity-90">
              U
            </div>
          </div>
        </header>

        {/* 主体布局 */}
        <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0 pb-4">

          {/* 左侧：激活输入区 */}
          <div className="w-full lg:w-[380px] flex-shrink-0 flex flex-col h-[400px] sm:h-[500px] lg:h-full">
            <div className="flex-1 bg-[#0f172a]/70 backdrop-blur-xl rounded-2xl border border-cyan-500/20 p-5 sm:p-6 shadow-[0_0_30px_rgba(0,0,0,0.5)] flex flex-col relative group">
              <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-2xl" />
              <h2 className="text-lg text-white font-semibold mb-4">卡片激活与查询</h2>
              <textarea
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder={"在此输入您的卡密\n格式：UK-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"}
                className="flex-1 w-full bg-[#050b14]/80 text-cyan-50 border border-slate-700/50 rounded-xl p-4 text-sm focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition-all resize-none placeholder:text-slate-600 mb-4 shadow-inner z-10"
              />

              <div className="flex flex-col gap-2.5 z-10">
                <p className="text-[11px] text-slate-500 text-center tracking-wide">
                  支持批量兑换，每行输入一个卡密，每个间隔5秒处理
                </p>

                {/* 主按钮 */}
                <button
                  onClick={onRedeemAndQuery}
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 active:scale-[0.98] transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(6,182,212,0.3)] tracking-widest"
                >
                  {loading ? "处理中..." : "兑换 / 查询"}
                </button>

                {/* 3DS 按钮（始终显示，激活后才有效果） */}
                <button
                  onClick={() => {
                    if (!currentCode) { showToast("请先激活卡片"); return; }
                    setShow3DS(true);
                  }}
                  className="w-full py-3 rounded-xl font-medium text-cyan-300 bg-cyan-500/8 border border-cyan-500/25 hover:bg-cyan-500/15 hover:border-cyan-500/40 active:scale-[0.98] transition-all flex items-center justify-center gap-2 tracking-wider text-sm"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  获取 3DS 验证码
                </button>
              </div>

              {error && <div className="text-red-400 text-xs mt-3 text-center z-10">{error}</div>}

              <div className="text-center mt-5 z-10 hidden sm:block">
                <span className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold">ZHILIANCARD • v1.0</span>
              </div>
            </div>
          </div>

          {/* 右侧面板 */}
          <div className="flex-1 flex flex-col min-w-0 h-auto lg:h-full">
            {!resp?.card ? (
              <div className="h-full min-h-[400px] bg-[#0f172a]/60 backdrop-blur-xl rounded-2xl border border-slate-700/50 flex flex-col items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-900/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(59,130,246,0.1)]">
                  <svg className="w-8 h-8 sm:w-10 sm:h-10 text-cyan-500 opacity-80" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 4H4C2.89 4 2.01 4.89 2.01 6L2 18C2 19.11 2.89 20 4 20H20C21.11 20 22 19.11 22 18V6C22 4.89 21.11 4 20 4ZM20 18H4V12H20V18ZM20 8H4V6H20V8Z" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl text-white font-medium mb-2 tracking-wide">等待输入卡密</h3>
                <p className="text-slate-500 text-xs sm:text-sm text-center px-4">激活或查询成功后，卡片信息将显示在这里</p>
              </div>
            ) : (
              <div className="h-full bg-[#0f172a]/60 backdrop-blur-xl rounded-2xl border border-cyan-500/20 p-4 sm:p-6 shadow-[0_0_30px_rgba(0,0,0,0.5)] flex flex-col overflow-y-auto custom-scrollbar">

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 flex-1">

                  {/* 左列：虚拟卡 + 状态 */}
                  <div className="flex flex-col gap-4 sm:gap-6">

                    {/* 卡片 UI */}
                    <div className="w-full flex flex-col justify-between aspect-auto sm:aspect-[1.586/1] min-h-[220px] bg-gradient-to-br from-cyan-900 via-blue-900 to-indigo-950 rounded-2xl p-5 sm:p-6 relative overflow-hidden shadow-[0_10px_40px_rgba(6,182,212,0.2)] border border-white/10 group select-none hover:scale-[1.02] transition-transform duration-300">
                      <div className="absolute top-0 right-0 w-[150%] h-[150%] bg-gradient-to-b from-white/10 to-transparent -rotate-45 translate-x-1/3 -translate-y-1/3 pointer-events-none" />

                      <div className="flex justify-between items-start relative z-10">
                        <span className="text-slate-300 text-xs sm:text-sm tracking-widest font-medium drop-shadow-md">SmartChain Tech Card</span>
                        <div className="w-10 h-7 sm:w-12 sm:h-9 bg-gradient-to-br from-yellow-200 to-yellow-500 rounded-md shadow-sm border border-yellow-400/50 opacity-90 overflow-hidden relative">
                          <div className="absolute top-1/2 w-full h-[1px] bg-black/20" />
                          <div className="absolute left-1/3 h-full w-[1px] bg-black/20" />
                        </div>
                      </div>

                      <div className="mt-6 mb-4 sm:my-0 relative z-10">
                        <div
                          className="font-mono text-[1.15rem] sm:text-2xl md:text-3xl text-white tracking-widest drop-shadow-lg cursor-pointer group/num inline-block whitespace-nowrap"
                          onClick={() => handleCopy(resp.card?.cardNumber, "卡号")}
                          title="点击复制卡号"
                        >
                          {displayCardNumber}
                          <CopyIcon />
                        </div>
                      </div>

                      <div className="flex justify-between items-end relative z-10">
                        <div className="flex gap-4 sm:gap-6">
                          <div className="cursor-pointer group/item" onClick={() => handleCopy(resp.card?.cvv, "CVV")} title="点击复制CVV">
                            <p className="text-[9px] sm:text-[10px] text-cyan-200 uppercase tracking-wider mb-0.5 sm:mb-1">CVV</p>
                            <p className="font-mono text-base sm:text-lg text-white flex items-center">{resp.card?.cvv || "•••"} <CopyIcon /></p>
                          </div>
                          <div className="cursor-pointer group/item" onClick={() => handleCopy(resp.card?.expiry, "有效期")} title="点击复制有效期">
                            <p className="text-[9px] sm:text-[10px] text-cyan-200 uppercase tracking-wider mb-0.5 sm:mb-1">Expiry</p>
                            <p className="font-mono text-base sm:text-lg text-white flex items-center">{resp.card?.expiry || "MM/YY"} <CopyIcon /></p>
                          </div>
                        </div>
                        <div className="origin-bottom-right scale-90 sm:scale-100">
                          <MastercardLogo />
                        </div>
                      </div>
                    </div>

                    {/* 激活状态面板 */}
                    <div className="bg-[#050b14]/50 rounded-xl p-4 sm:p-5 border border-slate-700/50">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs sm:text-sm text-slate-400">激活状态</span>
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] sm:text-xs font-bold border border-emerald-500/20 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {resp.card?.status ?? "Active"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs sm:text-sm text-slate-400">激活时间</span>
                        <span className="font-mono text-xs sm:text-sm text-slate-200">{formatTime(resp.activatedAt)}</span>
                      </div>
                      {resp.card?.validMinutes !== undefined && (
                        <div className="flex justify-between items-center border-t border-slate-700/50 pt-3">
                          <span className="text-xs sm:text-sm text-slate-400">剩余时间</span>
                          <CountdownTimer startTime={resp.activatedAt} validMinutes={resp.card.validMinutes} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 右列：账单地址（英国） */}
                  <div className="bg-[#050b14]/50 rounded-xl border border-slate-700/50 p-4 sm:p-5 flex flex-col h-full">
                    <div className="flex justify-between items-center mb-4 sm:mb-6">
                      <h3 className="text-white text-sm sm:text-base font-medium flex items-center gap-2">
                        <span className="text-base sm:text-lg">🇬🇧</span> 账单地址
                      </h3>
                      <button
                        onClick={() => handleCopy(
                          `${fullName}\n${address.street}\n${address.city}\n${address.county}\n${address.postcode}\n${address.country}`,
                          "完整地址"
                        )}
                        className="px-2.5 py-1.5 rounded text-[10px] sm:text-xs border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                      >
                        复制完整地址
                      </button>
                    </div>

                    <div className="space-y-3 sm:space-y-4 flex-1">
                      {/* 姓名 */}
                      <div className="group cursor-pointer border-b border-slate-800 pb-2 sm:pb-3" onClick={() => handleCopy(fullName, "姓名")}>
                        <p className="text-[10px] sm:text-xs text-slate-500 mb-0.5 sm:mb-1">全名 (Full Name)</p>
                        <p className="text-slate-200 text-xs sm:text-sm font-medium group-hover:text-cyan-400 transition-colors">
                          {fullName || "--"} <CopyIcon />
                        </p>
                      </div>

                      {/* 街道 */}
                      <div className="group cursor-pointer border-b border-slate-800 pb-2 sm:pb-3" onClick={() => handleCopy(address.street, "街道")}>
                        <p className="text-[10px] sm:text-xs text-slate-500 mb-0.5 sm:mb-1">街道 (Street)</p>
                        <p className="text-slate-200 text-xs sm:text-sm font-medium group-hover:text-cyan-400 transition-colors">
                          {address.street} <CopyIcon />
                        </p>
                      </div>

                      {/* 城市 */}
                      <div className="group cursor-pointer border-b border-slate-800 pb-2 sm:pb-3" onClick={() => handleCopy(address.city, "城市")}>
                        <p className="text-[10px] sm:text-xs text-slate-500 mb-0.5 sm:mb-1">城市 (City)</p>
                        <p className="text-slate-200 text-xs sm:text-sm font-medium group-hover:text-cyan-400 transition-colors">
                          {address.city} <CopyIcon />
                        </p>
                      </div>

                      {/* 郡/地区 & 邮编 */}
                      <div className="grid grid-cols-2 gap-4 border-b border-slate-800 pb-2 sm:pb-3">
                        <div className="group cursor-pointer" onClick={() => handleCopy(address.county, "郡/地区")}>
                          <p className="text-[10px] sm:text-xs text-slate-500 mb-0.5 sm:mb-1">郡/地区 (County)</p>
                          <p className="text-slate-200 text-xs sm:text-sm font-medium group-hover:text-cyan-400">{address.county} <CopyIcon /></p>
                        </div>
                        <div className="group cursor-pointer" onClick={() => handleCopy(address.postcode, "邮编")}>
                          <p className="text-[10px] sm:text-xs text-slate-500 mb-0.5 sm:mb-1">邮编 (Postcode)</p>
                          <p className="text-slate-200 text-xs sm:text-sm font-medium group-hover:text-cyan-400 font-mono">{address.postcode} <CopyIcon /></p>
                        </div>
                      </div>

                      {/* 国家 */}
                      <div className="group cursor-pointer" onClick={() => handleCopy(address.country, "国家")}>
                        <p className="text-[10px] sm:text-xs text-slate-500 mb-0.5 sm:mb-1">国家 (Country)</p>
                        <p className="text-slate-200 text-xs sm:text-sm font-medium group-hover:text-cyan-400">
                          🇬🇧 United Kingdom ({address.country}) <CopyIcon />
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 消费记录 */}
                <div className="mt-4 sm:mt-6 bg-[#050b14]/50 rounded-xl border border-slate-700/50 p-4 sm:p-5 min-h-[120px] flex flex-col">
                  <h3 className="text-white text-xs sm:text-sm font-medium mb-3 sm:mb-4">消费记录</h3>
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    <span className="text-[10px] sm:text-xs">暂无消费记录</span>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
      `}} />
    </div>
  );
}
