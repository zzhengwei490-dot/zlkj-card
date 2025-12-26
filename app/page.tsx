"use client";

import { useState, useMemo } from "react";
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
  };
};

// --- 2. 图标组件 ---

// 复制图标
function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

// 万事达 (Mastercard) Logo - SVG 矢量实现，确保颜色准确且无锯齿
function MastercardLogo() {
  return (
    <svg width="48" height="30" viewBox="0 0 48 30" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-md">
      {/* 红色圆 */}
      <circle cx="15" cy="15" r="15" fill="#EB001B" fillOpacity="0.9"/>
      {/* 黄色圆 */}
      <circle cx="33" cy="15" r="15" fill="#F79E1B" fillOpacity="0.9"/>
      {/* 中间交叠的橙色部分 (模拟混合模式) */}
      <path fillRule="evenodd" clipRule="evenodd" d="M24 15C24 9.84545 26.6909 5.29091 30.8182 2.50909C28.8 1.09091 26.5091 0.272727 24 0.272727C21.4909 0.272727 19.2 1.09091 17.1818 2.50909C21.3091 5.29091 24 9.84545 24 15ZM24 15C24 20.1545 21.3091 24.7091 17.1818 27.4909C19.2 28.9091 21.4909 29.7273 24 29.7273C26.5091 29.7273 28.8 28.9091 30.8182 27.4909C26.6909 24.7091 24 20.1545 24 15Z" fill="#FF5F00" fillOpacity="0.85"/>
    </svg>
  );
}

// --- 3. 辅助函数 ---
function formatTime(input?: string) {
  if (!input) return "--";
  const d = new Date(input);
  if (!Number.isFinite(d.getTime())) return input;
  // 格式化为：2025/12/26 12:30:05
  return d.toLocaleString("zh-CN", { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit', 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    hour12: false 
  });
}

export default function Home() {
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resp, setResp] = useState<ApiResp | null>(null);
  
  // 复制提示 Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // 点击复制逻辑
  const handleCopy = (text: string | undefined, label: string) => {
    if (!text) return;
    const cleanText = text.replace(/\s+/g, "");
    
    navigator.clipboard.writeText(cleanText).then(() => {
      setToastMsg(`✓ 已复制 ${label}`);
      setTimeout(() => setToastMsg(null), 2000);
    }).catch(() => {
      setToastMsg("❌ 复制失败，请手动复制");
      setTimeout(() => setToastMsg(null), 2000);
    });
  };

  // 卡号格式化 (4位一空)
  const displayCardNumber = useMemo(() => {
    const num = resp?.card?.cardNumber || "";
    return num.replace(/\s+/g, "").replace(/(\d{4})(?=\d)/g, "$1 ").trim();
  }, [resp]);

  // 接口请求
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
      
      {/* 背景光效 */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* 复制成功 Toast */}
      <div className={`fixed top-8 z-50 transition-all duration-300 transform ${toastMsg ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0 pointer-events-none'}`}>
        <div className="bg-emerald-500 text-white px-6 py-2 rounded-full shadow-lg font-bold text-sm flex items-center gap-2 backdrop-blur-md border border-white/20">
           {toastMsg}
        </div>
      </div>

      {/* --- Logo & 标题区域 --- */}
      <div className="relative z-10 mb-10 flex flex-col items-center animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="relative w-64 h-28 md:w-80 md:h-32 drop-shadow-[0_0_25px_rgba(6,182,212,0.4)] hover:scale-105 transition-transform duration-500">
          <Image 
            src="/logo.jpg" 
            alt="智链科技" 
            fill 
            className="object-contain"
            priority
          />
        </div>
        {/* 新增的渐变色中文标题 */}
        <h2 className="text-lg md:text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-cyan-200 to-white mt-[-5px] tracking-widest drop-shadow-sm uppercase text-center">
          智链科技虚拟卡-激活&查询
        </h2>
      </div>

      {/* --- 主体操作区 --- */}
      <main className="w-full max-w-lg relative z-10">
        
        {/* 输入框卡片 */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl ring-1 ring-white/5 mb-8 transition-all">
          <div className="relative group mb-6">
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
            className="w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.2)] active:scale-[0.98] transition-all disabled:opacity-50 tracking-widest flex justify-center items-center gap-2"
          >
            {loading ? "处理中..." : "立即激活 / 查询"}
          </button>

          {error && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-center text-sm animate-pulse">
              {error}
            </div>
          )}
        </div>

        {/* 结果展示 */}
        {resp?.card && (
          <div className="perspective-1000 animate-in zoom-in slide-in-from-bottom-6 duration-500">
            
            <div className="mb-4 text-center">
              <span className="px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold tracking-widest uppercase inline-flex items-center gap-2 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Active Status
              </span>
            </div>

            {/* --- 虚拟卡实体 (万事达版) --- */}
            <div className="relative w-full aspect-[1.586/1] rounded-2xl overflow-hidden shadow-2xl transition-transform hover:scale-[1.02] duration-300 group select-none border border-white/10 bg-[#1e1e1e]">
              
              {/* 卡面背景 */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#1e293b] via-[#0f172a] to-black z-0"></div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 blur-[60px] pointer-events-none"></div>

              {/* 卡面内容 */}
              <div className="relative z-10 p-6 md:p-8 h-full flex flex-col justify-between text-white">
                
                {/* 顶部: 芯片 + 万事达 Logo */}
                <div className="flex justify-between items-start">
                  <div className="w-12 h-9 bg-gradient-to-br from-yellow-200 to-yellow-600 rounded-md shadow-sm border border-yellow-500/30 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                    <div className="absolute top-1/2 w-full h-[1px] bg-black/20"></div>
                    <div className="absolute left-1/3 h-full w-[1px] bg-black/20"></div>
                    <div className="absolute right-1/3 h-full w-[1px] bg-black/20"></div>
                  </div>
                  
                  {/* Mastercard Logo (SVG) */}
                  <div className="opacity-90 scale-110 origin-right">
                    <MastercardLogo />
                  </div>
                </div>

                {/* 中部: 卡号 */}
                <div className="text-center mt-2 relative">
                  <div className="text-[9px] text-slate-500 uppercase tracking-[0.2em] mb-1">Card Number</div>
                  <div 
                    onClick={() => handleCopy(resp.card?.cardNumber, "卡号")}
                    className="group/num cursor-pointer inline-block relative py-1"
                  >
                    <div className="font-mono text-2xl md:text-3xl font-bold tracking-widest text-white drop-shadow-md flex items-center justify-center gap-2">
                      {displayCardNumber}
                    </div>
                    {/* 悬停出现的复制图标 */}
                    <div className="absolute top-1/2 -right-8 -translate-y-1/2 opacity-0 group-hover/num:opacity-100 transition-opacity text-cyan-400">
                      <CopyIcon />
                    </div>
                  </div>
                </div>

                {/* 底部: CVV + 有效期 */}
                <div className="flex justify-between items-end">
                  <div className="flex gap-8">
                    {/* CVV */}
                    <div 
                      onClick={() => handleCopy(resp.card?.cvv, "CVV")}
                      className="cursor-pointer group/item hover:text-cyan-400 transition-colors"
                    >
                      <div className="text-[8px] text-slate-500 uppercase tracking-wider mb-0.5">CVV</div>
                      <div className="font-mono text-lg font-bold">
                        {resp.card.cvv || "•••"}
                      </div>
                    </div>

                    {/* 有效期 */}
                    <div 
                      onClick={() => handleCopy(resp.card?.expiry, "有效期")}
                      className="cursor-pointer group/item hover:text-cyan-400 transition-colors"
                    >
                      <div className="text-[8px] text-slate-500 uppercase tracking-wider mb-0.5">Expires</div>
                      <div className="font-mono text-lg font-bold">
                        {resp.card.expiry || "MM/YY"}
                      </div>
                    </div>
                  </div>

                  {/* 时效 (小字) */}
                  <div className="text-right">
                     <div className="text-[8px] text-slate-500 uppercase tracking-wider mb-0.5">Valid</div>
                     <div className="font-mono text-sm text-emerald-400 font-bold">
                       {resp.card.validMinutes ? `${resp.card.validMinutes} Min` : "--"}
                     </div>
                  </div>
                </div>
              </div>
            </div>

            {/* --- 重点升级：激活时间超级高亮区 --- */}
            {/* 独立面板，位于卡片下方，非常醒目 */}
            <div className="mt-6 mx-2">
              <div className="relative overflow-hidden rounded-xl bg-cyan-950/40 border border-cyan-500/40 p-5 flex flex-col items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                 
                 <span className="text-cyan-400 text-[10px] font-bold uppercase tracking-[0.3em] mb-2 flex items-center gap-2">
                   <span className="w-2 h-2 bg-cyan-400 rounded-full animate-ping"></span>
                   Activation Time / 激活时间
                 </span>
                 
                 <span className="font-mono text-2xl md:text-3xl text-white font-bold tracking-widest drop-shadow-[0_0_15px_rgba(34,211,238,0.6)]">
                   {resp.card.redeemTime ? formatTime(resp.card.redeemTime) : formatTime(resp.activatedAt)}
                 </span>
              </div>
            </div>
            
            <div className="mt-8 text-center text-slate-600 text-[10px] tracking-[0.2em] uppercase opacity-60">
               点击卡面任意信息即可一键复制
            </div>

          </div>
        )}

        <footer className="mt-12 text-center text-slate-700 text-[10px] tracking-[0.3em] uppercase opacity-40">
          System Powered by SmartChain Tech
        </footer>
      </main>
    </div>
  );
}
