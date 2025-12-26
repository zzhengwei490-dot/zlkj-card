"use client";

import { useState, useMemo } from "react";
import Image from "next/image";

// --- 1. 类型定义 (保持与你的接口一致) ---
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

// --- 2. 辅助组件：复制图标 ---
function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

// --- 3. 辅助函数 ---
function formatTime(input?: string) {
  if (!input) return "--";
  const d = new Date(input);
  if (!Number.isFinite(d.getTime())) return input;
  return d.toLocaleString("zh-CN", { hour12: false });
}

export default function Home() {
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resp, setResp] = useState<ApiResp | null>(null);
  
  // 复制提示状态 (Toast)
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // --- 核心功能：点击复制 ---
  const handleCopy = (text: string | undefined, label: string) => {
    if (!text) return;
    // 复制时自动去除所有空格
    const cleanText = text.replace(/\s+/g, "");
    
    navigator.clipboard.writeText(cleanText).then(() => {
      setToastMsg(`✓ 已复制 ${label}`);
      // 2秒后自动消失
      setTimeout(() => setToastMsg(null), 2000);
    }).catch(() => {
      setToastMsg("❌ 复制失败，请手动复制");
      setTimeout(() => setToastMsg(null), 2000);
    });
  };

  // 格式化卡号显示 (视觉上每4位加空格)
  const displayCardNumber = useMemo(() => {
    const num = resp?.card?.cardNumber || "";
    return num.replace(/\s+/g, "").replace(/(\d{4})(?=\d)/g, "$1 ").trim();
  }, [resp]);

  // --- 接口请求逻辑 ---
  const onRedeemAndQuery = async () => {
    const k = key.trim();
    if (!k) {
      setError("请输入有效的卡密 / UUID");
      return;
    }

    setLoading(true);
    setError(null);
    setResp(null);

    try {
      // 调用整合后的接口
      const res = await fetch("/api/redeem-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key_id: k }),
      });
      const json = (await res.json()) as ApiResp;

      if (!json.ok) {
        setError(json.error || "激活或查询失败，请检查卡密状态");
      } else {
        setResp(json);
      }
    } catch (e: any) {
      setError(e?.message || "网络请求异常，请稍后再试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050b14] text-slate-200 font-sans flex flex-col items-center py-12 px-4 relative overflow-hidden selection:bg-cyan-500/30">
      
      {/* --- 背景动态光效 --- */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* --- 复制成功提示 (Toast) --- */}
      <div className={`fixed top-8 z-50 transition-all duration-300 transform ${toastMsg ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0 pointer-events-none'}`}>
        <div className="bg-emerald-500 text-white px-6 py-2 rounded-full shadow-[0_4px_12px_rgba(16,185,129,0.3)] font-bold text-sm flex items-center gap-2 backdrop-blur-md">
           {toastMsg}
        </div>
      </div>

      {/* --- 顶部 Logo --- */}
      <div className="relative z-10 mb-10 flex flex-col items-center animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="relative w-64 h-28 md:w-80 md:h-32 drop-shadow-[0_0_25px_rgba(6,182,212,0.4)] hover:scale-105 transition-transform duration-500">
          {/* 这里会自动读取 public/logo.jpg */}
          <Image 
            src="/logo.jpg" 
            alt="智链科技" 
            fill 
            className="object-contain"
            priority
          />
        </div>
        <div className="text-[10px] text-cyan-500/60 tracking-[0.4em] uppercase font-mono mt-[-5px]">
          Virtual Asset Terminal
        </div>
      </div>

      {/* --- 主体内容区 --- */}
      <main className="w-full max-w-lg relative z-10">
        
        {/* 输入框卡片 */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl ring-1 ring-white/5 transition-all">
          <div className="relative group mb-6">
             {/* 输入框流光边框 */}
             <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl blur opacity-20 group-hover:opacity-50 transition duration-500"></div>
             <input
              value={key}
              onChange={(e) => setKey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onRedeemAndQuery()}
              placeholder="在此输入您的卡密 (UUID)..."
              className="relative w-full bg-[#0a0f1c] text-center border border-slate-700 rounded-xl px-4 py-4 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-all font-mono tracking-wide text-lg shadow-inner"
            />
          </div>

          <button
            onClick={onRedeemAndQuery}
            disabled={loading}
            className="w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.2)] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed tracking-widest flex justify-center items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                PROCESSING...
              </>
            ) : "立即激活 / 查询"}
          </button>

          {/* 错误提示 */}
          {error && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-center text-sm animate-pulse font-mono flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {error}
            </div>
          )}
        </div>

        {/* --- 结果展示：高仿黑金虚拟卡 --- */}
        {resp?.card && (
          <div className="mt-8 perspective-1000 animate-in zoom-in slide-in-from-bottom-6 duration-500">
            <div className="mb-4 text-center">
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold tracking-widest uppercase inline-flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Active Status
              </span>
            </div>

            {/* 卡片容器 */}
            <div className="relative w-full aspect-[1.586/1] rounded-2xl overflow-hidden shadow-2xl transition-transform hover:scale-[1.02] duration-300 group select-none border border-white/10 bg-[#1e1e1e]">
              
              {/* 卡面纹理 */}
              <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-[#0f172a] to-black z-0"></div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 blur-[60px] pointer-events-none"></div>
              
              {/* 卡面内容 */}
              <div className="relative z-10 p-6 md:p-8 h-full flex flex-col justify-between text-white">
                
                {/* 顶部：芯片 */}
                <div className="flex justify-between items-start">
                  <div className="w-11 h-8 bg-gradient-to-br from-yellow-200 to-yellow-600 rounded-md shadow-sm border border-yellow-500/30 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                    <div className="absolute top-1/2 w-full h-[1px] bg-black/20"></div>
                    <div className="absolute left-1/3 h-full w-[1px] bg-black/20"></div>
                    <div className="absolute right-1/3 h-full w-[1px] bg-black/20"></div>
                  </div>
                  <div className="text-right opacity-80">
                    <span className="text-lg font-bold italic tracking-wider">VISA</span>
                  </div>
                </div>

                {/* 中部：卡号 (可点击) */}
                <div className="text-center mt-2">
                  <div 
                    onClick={() => handleCopy(resp.card?.cardNumber, "卡号")}
                    className="group/num cursor-pointer inline-block relative"
                    title="点击复制卡号"
                  >
                    <div className="text-[9px] text-slate-500 uppercase tracking-[0.2em] mb-1 group-hover/num:text-cyan-400 transition-colors">Card Number</div>
                    <div className="font-mono text-2xl md:text-3xl font-bold tracking-widest text-white drop-shadow-md group-hover/num:text-cyan-50 transition-colors flex items-center justify-center gap-2">
                      {displayCardNumber}
                      {/* 悬停显示的复制图标 */}
                      <CopyIcon className="opacity-0 group-hover/num:opacity-100 transition-opacity text-cyan-400 w-5 h-5 absolute -right-8" />
                    </div>
                  </div>
                </div>

                {/* 底部：日期与CVV (可点击) */}
                <div className="flex justify-between items-end">
                  <div className="flex gap-8">
                    {/* CVV */}
                    <div 
                      onClick={() => handleCopy(resp.card?.cvv, "CVV")}
                      className="cursor-pointer group/item"
                    >
                      <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1 group-hover/item:text-cyan-400 transition-colors">CVV</div>
                      <div className="font-mono text-lg font-bold group-hover/item:text-cyan-50 transition-colors flex items-center gap-1">
                        {resp.card.cvv || "•••"}
                      </div>
                    </div>

                    {/* 有效期 */}
                    <div 
                      onClick={() => handleCopy(resp.card?.expiry, "有效期")}
                      className="cursor-pointer group/item"
                    >
                      <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1 group-hover/item:text-cyan-400 transition-colors">Expires</div>
                      <div className="font-mono text-lg font-bold group-hover/item:text-cyan-50 transition-colors">
                        {resp.card.expiry || "MM/YY"}
                      </div>
                    </div>
                  </div>

                  {/* 时效 */}
                  <div className="text-right">
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Duration</div>
                    <div className="font-mono text-sm text-cyan-400 font-bold">
                      {resp.card.validMinutes ? `${resp.card.validMinutes} Min` : "--"}
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* 底部时间信息 */}
            <div className="mt-4 flex justify-between px-2 text-[10px] text-slate-500 font-mono">
               <span>激活时间: {resp.card.redeemTime ? formatTime(resp.card.redeemTime) : formatTime(resp.activatedAt)}</span>
               <span>点击卡面信息即可复制</span>
            </div>
          </div>
        )}

        <footer className="mt-12 text-center text-slate-600 text-[10px] tracking-[0.3em] uppercase opacity-50 hover:opacity-100 transition-opacity">
          System Powered by SmartChain Tech
        </footer>
      </main>
    </div>
  );
}
