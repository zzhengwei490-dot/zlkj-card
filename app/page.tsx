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
  };
};

// --- 2. 模拟随机姓名库 & 固定地址 ---
const RANDOM_NAMES = [
  "Jennifer Nguyen", "Michael Smith", "Sarah Johnson", "David Brown",
  "Emily Davis", "James Wilson", "Jessica Taylor", "Daniel Anderson",
  "Ashley Thomas", "Matthew Jackson", "Christopher White", "Amanda Harris",
  "Joshua Martin", "Melissa Thompson", "Kevin Garcia", "Laura Martinez",
  "Robert Clark", "Michelle Lewis", "William Walker", "Elizabeth Hall"
];

const MOCK_ADDRESS_BASE = {
  street: "201 Whitehall Court",
  city: "American Canyon",
  state: "CA",
  zip: "94503",
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
  <svg width="36" height="22" viewBox="0 0 48 30" fill="none" xmlns="http://www.w3.org/2000/svg">
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
  
  // 随机姓名状态
  const [fullName, setFullName] = useState("");

  // 初始加载时分配一个随机姓名
  useEffect(() => {
    setFullName(RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)]);
  }, []);

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

  // 接口请求
  const onRedeemAndQuery = async () => {
    const k = key.trim();
    if (!k) {
      setError("请输入有效的卡密或卡号");
      return;
    }

    setLoading(true);
    setError(null);

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
        setResp(null);
      } else {
        setResp(json);
        // --- 重点：每次查询成功后，重新随机生成一个姓名 ---
        setFullName(RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)]);
        showToast("✓ 卡片数据获取成功");
      }
    } catch (e: any) {
      showToast("网络连接异常");
      setError(e?.message || "网络请求异常，请稍后再试");
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

      {/* Toast 提示框 */}
      <div className={`fixed top-8 right-8 z-50 transition-all duration-300 transform ${toastMsg ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0 pointer-events-none'}`}>
        <div className="bg-[#0f172a]/90 backdrop-blur-md text-emerald-400 px-6 py-3 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.2)] font-medium text-sm border border-emerald-500/30 flex items-center gap-2">
           {toastMsg}
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto h-full p-4 md:p-6 lg:p-8 relative z-10 flex flex-col lg:h-screen">
        
        {/* 顶部 Header */}
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
          
          {/* 左侧面板：激活与查询输入区 */}
          <div className="w-full lg:w-[380px] flex-shrink-0 flex flex-col h-[400px] sm:h-[500px] lg:h-full">
            <div className="flex-1 bg-[#0f172a]/70 backdrop-blur-xl rounded-2xl border border-cyan-500/20 p-5 sm:p-6 shadow-[0_0_30px_rgba(0,0,0,0.5)] flex flex-col relative group">
              <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-2xl" />
              
              <h2 className="text-lg text-white font-semibold mb-4">卡片激活与查询</h2>
              
              <textarea
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="在此输入您的卡密或卡号 (每行一个，最多10个)..."
                className="flex-1 w-full bg-[#050b14]/80 text-cyan-50 border border-slate-700/50 rounded-xl p-4 text-sm focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition-all resize-none placeholder:text-slate-600 mb-6 shadow-inner z-10"
              />
              
              <div className="flex flex-col gap-3 z-10">
                <p className="text-[11px] sm:text-xs text-slate-500 text-center tracking-wide">支持批量兑换，每行输入一个卡密，每个间隔5秒处理</p>
                <button
                  onClick={onRedeemAndQuery}
                  disabled={loading}
                  className="w-full py-3.5 sm:py-4 rounded-xl font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 active:scale-[0.98] transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(6,182,212,0.3)] tracking-widest"
                >
                  {loading ? "处理中..." : "兑换 / 查询"}
                </button>
              </div>
              
              {error && <div className="text-red-400 text-xs mt-4 text-center z-10">{error}</div>}
              
              <div className="text-center mt-5 sm:mt-6 z-10 hidden sm:block">
                <span className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold">ZHILIancard • v1.0</span>
              </div>
            </div>
          </div>

          {/* 右侧面板 (动态渲染区) */}
          <div className="flex-1 flex flex-col min-w-0 h-auto lg:h-full">
            {!resp?.card ? (
              // 空状态
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
              // 成功展示状态 (滚动区域)
              <div className="h-full bg-[#0f172a]/60 backdrop-blur-xl rounded-2xl border border-cyan-500/20 p-4 sm:p-6 shadow-[0_0_30px_rgba(0,0,0,0.5)] flex flex-col overflow-y-auto custom-scrollbar">
                
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 flex-1">
                  
                  {/* 左列：虚拟卡体 + 状态 */}
                  <div className="flex flex-col gap-4 sm:gap-6">
                    {/* --- 修复点：修改了卡片容器高度和卡号文字大小逻辑 --- */}
                    <div className="w-full flex flex-col justify-between aspect-auto sm:aspect-[1.586/1] min-h-[220px] bg-gradient-to-br from-cyan-900 via-blue-900 to-indigo-950 rounded-2xl p-5 sm:p-6 relative overflow-hidden shadow-[0_10px_40px_rgba(6,182,212,0.2)] border border-white/10 group select-none hover:scale-[1.02] transition-transform duration-300">
                      {/* 镭射光效 */}
                      <div className="absolute top-0 right-0 w-[150%] h-[150%] bg-gradient-to-b from-white/10 to-transparent -rotate-45 translate-x-1/3 -translate-y-1/3 pointer-events-none" />
                      
                      <div className="flex justify-between items-start relative z-10">
                        <span className="text-slate-300 text-xs sm:text-sm tracking-widest font-medium drop-shadow-md">SmartChain Tech Card</span>
                        <div className="w-10 h-7 sm:w-12 sm:h-9 bg-gradient-to-br from-yellow-200 to-yellow-500 rounded-md shadow-sm border border-yellow-400/50 opacity-90 overflow-hidden relative">
                           <div className="absolute top-1/2 w-full h-[1px] bg-black/20"></div>
                           <div className="absolute left-1/3 h-full w-[1px] bg-black/20"></div>
                        </div>
                      </div>

                      <div className="mt-6 mb-4 sm:my-0 relative z-10">
                        <div 
                          // 强制不换行 (whitespace-nowrap)，并在小屏上缩小字号
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
                      <div className="flex justify-between items-center mb-3 sm:mb-4">
                        <span className="text-xs sm:text-sm text-slate-400">卡片余额</span>
                        <span className="text-base sm:text-lg font-bold text-emerald-400">$0.00</span>
                      </div>
                      <div className="flex justify-between items-center mb-3 sm:mb-4">
                        <span className="text-xs sm:text-sm text-slate-400">激活状态</span>
                        <span className="px-2 py-1 sm:px-3 sm:py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] sm:text-xs font-bold border border-emerald-500/20 flex items-center gap-1.5 sm:gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs sm:text-sm text-slate-400">兑换时间</span>
                        <span className="font-mono text-xs sm:text-sm text-slate-200">
                          {resp.card?.redeemTime ? formatTime(resp.card.redeemTime) : formatTime(resp.activatedAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 右列：账单地址 */}
                  <div className="bg-[#050b14]/50 rounded-xl border border-slate-700/50 p-4 sm:p-5 flex flex-col h-full">
                    <div className="flex justify-between items-center mb-4 sm:mb-6">
                      <h3 className="text-white text-sm sm:text-base font-medium flex items-center gap-2">
                        <span className="text-base sm:text-lg">🇺🇸</span> 账单地址
                      </h3>
                      <button 
                        onClick={() => handleCopy(`${fullName}\n${MOCK_ADDRESS_BASE.street}\n${MOCK_ADDRESS_BASE.city}, ${MOCK_ADDRESS_BASE.state} ${MOCK_ADDRESS_BASE.zip}\n${MOCK_ADDRESS_BASE.country}`, "完整地址")}
                        className="px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded text-[10px] sm:text-xs border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                      >
                        复制完整地址
                      </button>
                    </div>

                    <div className="space-y-3 sm:space-y-4 flex-1">
                      {/* Name - 现在使用的是随机姓名 fullName */}
                      <div className="group cursor-pointer border-b border-slate-800 pb-2 sm:pb-3" onClick={() => handleCopy(fullName, "姓名")}>
                        <p className="text-[10px] sm:text-xs text-slate-500 mb-0.5 sm:mb-1">全名</p>
                        <p className="text-slate-200 text-xs sm:text-sm font-medium transition-colors group-hover:text-cyan-400">
                          {fullName || "--"} <CopyIcon />
                        </p>
                      </div>

                      {/* Street */}
                      <div className="group cursor-pointer border-b border-slate-800 pb-2 sm:pb-3" onClick={() => handleCopy(MOCK_ADDRESS_BASE.street, "街道")}>
                        <p className="text-[10px] sm:text-xs text-slate-500 mb-0.5 sm:mb-1">街道</p>
                        <p className="text-slate-200 text-xs sm:text-sm font-medium transition-colors group-hover:text-cyan-400">
                          {MOCK_ADDRESS_BASE.street} <CopyIcon />
                        </p>
                      </div>

                      {/* City */}
                      <div className="group cursor-pointer border-b border-slate-800 pb-2 sm:pb-3" onClick={() => handleCopy(MOCK_ADDRESS_BASE.city, "城市")}>
                        <p className="text-[10px] sm:text-xs text-slate-500 mb-0.5 sm:mb-1">城市</p>
                        <p className="text-slate-200 text-xs sm:text-sm font-medium transition-colors group-hover:text-cyan-400">
                          {MOCK_ADDRESS_BASE.city} <CopyIcon />
                        </p>
                      </div>

                      {/* State & Zip */}
                      <div className="grid grid-cols-2 gap-4 border-b border-slate-800 pb-2 sm:pb-3">
                        <div className="group cursor-pointer" onClick={() => handleCopy(MOCK_ADDRESS_BASE.state, "州/省")}>
                          <p className="text-[10px] sm:text-xs text-slate-500 mb-0.5 sm:mb-1">州/省</p>
                          <p className="text-slate-200 text-xs sm:text-sm font-medium group-hover:text-cyan-400">{MOCK_ADDRESS_BASE.state} <CopyIcon /></p>
                        </div>
                        <div className="group cursor-pointer" onClick={() => handleCopy(MOCK_ADDRESS_BASE.zip, "邮编")}>
                          <p className="text-[10px] sm:text-xs text-slate-500 mb-0.5 sm:mb-1">邮编</p>
                          <p className="text-slate-200 text-xs sm:text-sm font-medium group-hover:text-cyan-400">{MOCK_ADDRESS_BASE.zip} <CopyIcon /></p>
                        </div>
                      </div>

                      {/* Country */}
                      <div className="group cursor-pointer" onClick={() => handleCopy(MOCK_ADDRESS_BASE.country, "国家")}>
                        <p className="text-[10px] sm:text-xs text-slate-500 mb-0.5 sm:mb-1">国家</p>
                        <p className="text-slate-200 text-xs sm:text-sm font-medium group-hover:text-cyan-400">{MOCK_ADDRESS_BASE.country} <CopyIcon /></p>
                      </div>
                    </div>
                  </div>

                </div>

                {/* 消费记录模块 */}
                <div className="mt-4 sm:mt-6 bg-[#050b14]/50 rounded-xl border border-slate-700/50 p-4 sm:p-5 min-h-[120px] sm:min-h-[150px] flex flex-col">
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
      
      {/* 隐藏滚动条的 CSS */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
      `}} />
    </div>
  );
}
