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

// --- 2. 模拟账单地址数据 ---
const MOCK_ADDRESS = {
  fullName: "Niko Zhang",
  street: "123 Tech Lane",
  city: "San Francisco",
  state: "CA",
  zip: "94107",
  country: "US",
};

// --- 3. 辅助组件与图标 ---
function formatTime(input?: string) {
  if (!input) return "--";
  const d = new Date(input);
  if (!Number.isFinite(d.getTime())) return input;
  return d.toLocaleString("zh-CN", { 
    year: 'numeric', month: '2-digit', day: '2-digit', 
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false 
  });
}

const CopyIcon = () => (
  <svg className="w-3.5 h-3.5 text-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity ml-2 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const MastercardLogo = () => (
  <svg width="40" height="24" viewBox="0 0 48 30" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="15" cy="15" r="15" fill="#EB001B" fillOpacity="0.9"/>
    <circle cx="33" cy="15" r="15" fill="#F79E1B" fillOpacity="0.9"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M24 15C24 9.84545 26.6909 5.29091 30.8182 2.50909C28.8 1.09091 26.5091 0.272727 24 0.272727C21.4909 0.272727 19.2 1.09091 17.1818 2.50909C21.3091 5.29091 24 9.84545 24 15ZM24 15C24 20.1545 21.3091 24.7091 17.1818 27.4909C19.2 28.9091 21.4909 29.7273 24 29.7273C26.5091 29.7273 28.8 28.9091 30.8182 27.4909C26.6909 24.7091 24 20.1545 24 15Z" fill="#FF5F00" fillOpacity="0.85"/>
  </svg>
);

export default function Home() {
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resp, setResp] = useState<ApiResp | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2000);
  };

  const handleCopy = (text: string | undefined, label: string) => {
    if (!text || text === "--") return;
    const textToCopy = label === "卡号" ? text.replace(/\s+/g, "") : text;
    navigator.clipboard.writeText(textToCopy).then(() => {
      showToast(`✓ 成功复制 ${label}`);
    }).catch(() => {
      showToast("❌ 复制失败");
    });
  };

  const displayCardNumber = useMemo(() => {
    const num = resp?.card?.cardNumber || "";
    return num.replace(/\s+/g, "").replace(/(\d{4})(?=\d)/g, "$1 ").trim();
  }, [resp]);

  const onRedeemAndQuery = async () => {
    const k = key.trim();
    if (!k) return showToast("请输入有效的卡密 (UUID)");

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/redeem-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key_id: k.split('\n')[0] }), 
      });
      const json = (await res.json()) as ApiResp;

      if (!json.ok) {
        showToast(json.error || "激活或查询失败");
        setError(json.error || "请求失败，请检查卡密");
        setResp(null);
      } else {
        setResp(json);
        showToast("✓ 卡片数据获取成功");
      }
    } catch (e: any) {
      showToast("网络连接异常");
      setError(e?.message || "网络请求异常");
      setResp(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060a14] text-slate-300 font-sans selection:bg-cyan-900/50 relative overflow-hidden">
      
      {/* 高级感科技网格背景 */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" 
           style={{ backgroundImage: 'linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
      />
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Toast */}
      <div className={`fixed top-8 right-8 z-50 transition-all duration-300 transform ${toastMsg ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0 pointer-events-none'}`}>
        <div className="bg-[#0f172a]/90 backdrop-blur-md text-emerald-400 px-6 py-3 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.2)] font-medium text-sm border border-emerald-500/30 flex items-center gap-2">
           {toastMsg}
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto h-full p-4 md:p-6 lg:p-8 relative z-10">
        
        {/* 顶部 Header */}
        <header className="flex justify-between items-center mb-8">
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
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center text-white font-bold border border-cyan-400/30 shadow-lg">
              U
            </div>
          </div>
        </header>

        {/* 主体布局 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:h-[calc(100vh-8rem)]">
          
          {/* 左侧面板 */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* 激活与查询模块 */}
            <div className="bg-[#0f172a]/60 backdrop-blur-xl rounded-2xl border border-cyan-500/20 p-6 shadow-[0_0_30px_rgba(0,0,0,0.5)] relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <h2 className="text-lg text-white font-semibold mb-1">卡片激活与查询</h2>
              <p className="text-xs text-slate-500 mb-5">Refined central key</p>
              
              <textarea
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="在此输入您的卡密 (UUID)..."
                className="w-full bg-[#050b14]/80 text-cyan-50 border border-slate-700/50 rounded-xl p-4 text-sm focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition-all resize-none placeholder:text-slate-600 h-28 mb-4 shadow-inner"
              />
              
              <button
                onClick={onRedeemAndQuery}
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 active:scale-[0.98] transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(6,182,212,0.3)] tracking-wider"
              >
                {loading ? "处理中..." : "立即激活 / 查询"}
              </button>
              
              {error && <div className="text-red-400 text-xs mt-4 pl-1">{error}</div>}
            </div>

            {/* 最近活动列表 (静态展示增强科技感) */}
            <div className="flex-1 bg-[#0f172a]/60 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
              <h2 className="text-lg text-white font-semibold mb-5">最近活动列表</h2>
              <div className="space-y-4">
                {[1, 2, 3].map((_, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-slate-800/50 last:border-0 text-sm">
                    <span className="text-slate-400 font-mono">2025/12/26 12:30:05</span>
                    <span className="text-slate-300">Niko Zhang</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 右侧面板 (动态渲染区) */}
          <div className="lg:col-span-8">
            {!resp?.card ? (
              // 空状态
              <div className="h-full bg-[#0f172a]/60 backdrop-blur-xl rounded-2xl border border-slate-700/50 flex flex-col items-center justify-center min-h-[400px] shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                <div className="w-20 h-20 bg-blue-900/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(59,130,246,0.1)]">
                  <svg className="w-10 h-10 text-cyan-500 opacity-80" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 4H4C2.89 4 2.01 4.89 2.01 6L2 18C2 19.11 2.89 20 4 20H20C21.11 20 22 19.11 22 18V6C22 4.89 21.11 4 20 4ZM20 18H4V12H20V18ZM20 8H4V6H20V8Z" />
                  </svg>
                </div>
                <h3 className="text-xl text-white font-medium mb-2 tracking-wide">等待输入卡密</h3>
                <p className="text-slate-500 text-sm">激活成功后，您的专属虚拟卡信息将在此处生成</p>
              </div>
            ) : (
              // 成功展示状态
              <div className="h-full bg-[#0f172a]/60 backdrop-blur-xl rounded-2xl border border-cyan-500/20 p-6 shadow-[0_0_30px_rgba(0,0,0,0.5)] flex flex-col">
                <h2 className="text-lg text-white font-semibold mb-6">卡片详情与管理</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
                  
                  {/* 左列：虚拟卡体 + 状态 */}
                  <div className="flex flex-col gap-6">
                    {/* 实体卡片 UI */}
                    <div className="w-full aspect-[1.586/1] bg-gradient-to-br from-cyan-900 via-blue-900 to-indigo-950 rounded-2xl p-6 relative overflow-hidden shadow-[0_10px_40px_rgba(6,182,212,0.2)] border border-white/10 group select-none hover:scale-[1.02] transition-transform duration-300">
                      {/* 镭射光效 */}
                      <div className="absolute top-0 right-0 w-[150%] h-[150%] bg-gradient-to-b from-white/10 to-transparent -rotate-45 translate-x-1/3 -translate-y-1/3 pointer-events-none" />
                      
                      <div className="flex justify-between items-start relative z-10">
                        <span className="text-slate-300 text-sm tracking-widest font-medium drop-shadow-md">SmartChain Tech Virtual Card</span>
                        <div className="w-12 h-9 bg-gradient-to-br from-yellow-200 to-yellow-500 rounded-md shadow-sm border border-yellow-400/50 opacity-90 overflow-hidden relative">
                           <div className="absolute top-1/2 w-full h-[1px] bg-black/20"></div>
                           <div className="absolute left-1/3 h-full w-[1px] bg-black/20"></div>
                        </div>
                      </div>

                      <div className="mt-10 relative z-10">
                        <div 
                          className="font-mono text-2xl md:text-[1.7rem] text-white tracking-widest drop-shadow-lg cursor-pointer group/num inline-block"
                          onClick={() => handleCopy(resp.card?.cardNumber, "卡号")}
                          title="点击复制卡号"
                        >
                          {displayCardNumber}
                          <CopyIcon />
                        </div>
                      </div>

                      <div className="flex justify-between items-end mt-8 relative z-10">
                        <div className="flex gap-6">
                          <div className="cursor-pointer group/item" onClick={() => handleCopy(resp.card?.cvv, "CVV")} title="点击复制CVV">
                            <p className="text-[10px] text-cyan-200 uppercase tracking-wider mb-1">CVV</p>
                            <p className="font-mono text-lg text-white flex items-center">{resp.card?.cvv || "•••"} <CopyIcon /></p>
                          </div>
                          <div className="cursor-pointer group/item" onClick={() => handleCopy(resp.card?.expiry, "有效期")} title="点击复制有效期">
                            <p className="text-[10px] text-cyan-200 uppercase tracking-wider mb-1">Expiry</p>
                            <p className="font-mono text-lg text-white flex items-center">{resp.card?.expiry || "MM/YY"} <CopyIcon /></p>
                          </div>
                        </div>
                        <MastercardLogo />
                      </div>
                    </div>

                    {/* 激活状态面板 */}
                    <div className="bg-[#050b14]/50 rounded-xl p-5 border border-slate-700/50">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-sm text-slate-400">激活状态</span>
                        <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
                        </span>
                      </div>
                      <div>
                        <span className="text-sm text-slate-400 block mb-1">激活时间</span>
                        <span className="font-mono text-lg text-slate-200">
                          {resp.card?.redeemTime ? formatTime(resp.card.redeemTime) : formatTime(resp.activatedAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 右列：账单地址 */}
                  <div className="bg-[#050b14]/50 rounded-xl border border-slate-700/50 p-5 flex flex-col relative">
                    <h3 className="text-white font-medium mb-6 flex items-center gap-2">
                      <span className="text-lg">🇺🇸</span> 美国账单地址
                    </h3>

                    <div className="space-y-5 flex-1">
                      {/* Name */}
                      <div className="group cursor-pointer" onClick={() => handleCopy(MOCK_ADDRESS.fullName, "姓名")}>
                        <p className="text-xs text-slate-500 mb-1 flex items-center">
                          <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                          姓名
                        </p>
                        <p className="text-slate-200 text-sm pl-4 font-medium transition-colors group-hover:text-cyan-400">
                          {MOCK_ADDRESS.fullName} <CopyIcon />
                        </p>
                      </div>

                      {/* Address */}
                      <div className="group cursor-pointer" onClick={() => handleCopy(`${MOCK_ADDRESS.street}, ${MOCK_ADDRESS.city}, ${MOCK_ADDRESS.state} ${MOCK_ADDRESS.zip}`, "街道地址")}>
                        <p className="text-xs text-slate-500 mb-1 flex items-center">
                          <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          地址
                        </p>
                        <p className="text-slate-200 text-sm pl-4 leading-relaxed font-medium transition-colors group-hover:text-cyan-400">
                          {MOCK_ADDRESS.street} <br/> {MOCK_ADDRESS.city}, {MOCK_ADDRESS.state} {MOCK_ADDRESS.zip} <CopyIcon />
                        </p>
                      </div>

                      {/* Zip & Country */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="group cursor-pointer" onClick={() => handleCopy(MOCK_ADDRESS.zip, "邮编")}>
                          <p className="text-xs text-slate-500 mb-1">邮编</p>
                          <p className="text-slate-200 text-sm pl-1 font-medium group-hover:text-cyan-400">{MOCK_ADDRESS.zip} <CopyIcon /></p>
                        </div>
                        <div className="group cursor-pointer" onClick={() => handleCopy(MOCK_ADDRESS.country, "国家")}>
                          <p className="text-xs text-slate-500 mb-1">国家</p>
                          <p className="text-slate-200 text-sm pl-1 font-medium group-hover:text-cyan-400">{MOCK_ADDRESS.country} <CopyIcon /></p>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => handleCopy(`${MOCK_ADDRESS.fullName}\n${MOCK_ADDRESS.street}\n${MOCK_ADDRESS.city}, ${MOCK_ADDRESS.state} ${MOCK_ADDRESS.zip}\n${MOCK_ADDRESS.country}`, "完整地址")}
                      className="mt-6 w-full py-2.5 rounded-lg border border-cyan-500/50 text-cyan-400 text-sm font-medium hover:bg-cyan-500/10 transition-colors"
                    >
                      Copy Full Address
                    </button>
                  </div>

                </div>
              </div>
            )}
          </div>
        </div>

        {/* 底部版权 */}
        <footer className="mt-8 text-center text-slate-600 text-xs tracking-widest uppercase">
          <p>System Powered by SmartChain Tech</p>
          <p className="mt-1 opacity-70 text-[10px]">智链科技系统支持</p>
        </footer>

      </div>
    </div>
  );
}
