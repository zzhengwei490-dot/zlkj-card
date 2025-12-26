"use client";

import { useState } from "react";
import Image from "next/image";

export default function Home() {
  const [inputKey, setInputKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [currentAction, setCurrentAction] = useState("");

  const handleRequest = async (type: "query" | "redeem") => {
    if (!inputKey.trim()) {
      setError("请输入有效的卡号或卡密");
      return;
    }
    setLoading(true);
    setCurrentAction(type);
    setError("");
    setResult(null);

    try {
      // 请求后端 API (代理转发，解决跨域)
      const res = await fetch(`/api/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key_id: inputKey.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "请求失败");
      
      if (data.success || data.card) {
        setResult(data);
        if (type === 'redeem') alert("激活成功！");
      } else {
        throw new Error("未找到相关信息");
      }
    } catch (err: any) {
      setError(err.message || "网络请求发生错误");
    } finally {
      setLoading(false);
      setCurrentAction("");
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1c] text-slate-200 font-sans flex flex-col items-center pt-20 px-4 pb-12 relative overflow-hidden">
      
      {/* 背景氛围光效 */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Logo 区域 */}
      <div className="relative z-10 mb-10 flex flex-col items-center animate-in fade-in zoom-in duration-700">
        <div className="relative w-72 h-36 md:w-96 md:h-48 mb-4 drop-shadow-[0_0_30px_rgba(59,130,246,0.5)]">
          {/* 这里会自动读取 public/logo.jpg */}
          <Image 
            src="/logo.jpg" 
            alt="智链科技" 
            fill 
            className="object-contain"
            priority
          />
        </div>
        <h1 className="text-xl font-bold tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 uppercase opacity-90">
          虚拟资产激活终端
        </h1>
      </div>

      {/* 核心操作区 */}
      <div className="w-full max-w-2xl relative z-10">
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl ring-1 ring-white/5">
          
          <input
            type="text"
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            placeholder="在此输入您的卡密 (KEY)..."
            className="w-full bg-black/30 border border-slate-600/50 rounded-xl px-6 py-5 text-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono mb-8 text-center tracking-widest"
          />

          <div className="grid grid-cols-2 gap-6">
            <button
              onClick={() => handleRequest("query")}
              disabled={loading}
              className="py-4 px-4 rounded-xl font-medium text-blue-300 bg-blue-900/20 border border-blue-500/30 hover:bg-blue-900/40 hover:border-blue-400 transition-all disabled:opacity-50"
            >
              {loading && currentAction === "query" ? "SCANNING..." : "查询状态"}
            </button>
            <button
              onClick={() => handleRequest("redeem")}
              disabled={loading}
              className="py-4 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all disabled:opacity-50 tracking-wide"
            >
              {loading && currentAction === "redeem" ? "ACTIVATING..." : "立即激活"}
            </button>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-center text-sm animate-pulse font-mono">
            [ERROR] {error}
          </div>
        )}
      </div>

      {/* 结果展示卡片 */}
      {result && (
        <div className="mt-10 w-full max-w-2xl animate-in slide-in-from-bottom-6 duration-500">
          <div className="relative group">
            {/* 边框发光特效 */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-1000"></div>
            
            <div className="relative bg-[#0f172a] rounded-xl overflow-hidden border border-slate-700">
              {/* 状态栏 */}
              <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Card Info</span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide ${result.success ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'}`}>
                  {result.success ? "● ACTIVE / 已激活" : "UNKNOWN"}
                </span>
              </div>

              {/* 卡片详情 */}
              <div className="p-6 md:p-8 space-y-6">
                {result.card ? (
                  <>
                    <div>
                      <label className="text-xs text-blue-500/70 uppercase tracking-widest font-semibold">Card Number</label>
                      <div className="flex items-center gap-3 mt-1 bg-black/20 p-2 rounded border border-white/5">
                        <p className="text-2xl md:text-3xl font-mono text-white tracking-widest drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
                          {result.card.pan}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-2">
                      <InfoItem label="CVV" value={result.card.cvv} />
                      <InfoItem label="EXP DATE" value={`${result.card.exp_month}/${result.card.exp_year}`} />
                      <InfoItem label="TYPE" value={result.card.card_type} />
                      <InfoItem label="LIMIT" value={result.card.card_limit} highlight />
                    </div>

                    <div className="flex flex-col md:flex-row gap-6 text-[10px] text-slate-500 font-mono mt-4 pt-4 border-t border-slate-800/50">
                       <span>Expire: {result.card.expire_time ? result.card.expire_time.split('T')[0] : '--'}</span>
                       {result.used_time && <span>Activated: {result.used_time.split('T')[0]}</span>}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4 text-slate-400">
                    <p className="mb-2">操作成功，但服务端未返回详情</p>
                    <pre className="text-left bg-black/50 p-3 rounded text-xs text-green-400 overflow-auto border border-slate-800">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      <footer className="mt-auto pt-10 text-slate-600 text-[10px] tracking-[0.2em] uppercase opacity-50">
        System Powered by SmartChain Tech
      </footer>
    </div>
  );
}

function InfoItem({ label, value, highlight }: { label: string, value: any, highlight?: boolean }) {
  return (
    <div>
      <div className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider">{label}</div>
      <div className={`font-mono text-lg ${highlight ? 'text-cyan-400 font-bold drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]' : 'text-slate-200'}`}>
        {value || "--"}
      </div>
    </div>
  );
}
