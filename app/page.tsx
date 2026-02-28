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

// --- 2. 模拟账单地址数据 (可根据需要替换为接口返回) ---
const MOCK_ADDRESS = {
  fullName: "Jennifer Nguyen",
  street: "201 Whitehall Court",
  city: "American Canyon",
  state: "CA",
  zip: "94503",
  country: "US",
};

// --- 3. 辅助函数 ---
function formatTime(input?: string) {
  if (!input) return "--";
  const d = new Date(input);
  if (!Number.isFinite(d.getTime())) return input;
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

// 剪贴板图标组件 (用于空状态)
function ClipboardIcon() {
  return (
    <svg className="w-12 h-12 text-slate-600 mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  );
}

export default function Home() {
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resp, setResp] = useState<ApiResp | null>(null);
  
  // 提示 Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2000);
  };

  // 点击复制逻辑
  const handleCopy = (text: string | undefined, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      showToast(`✓ 已复制 ${label}`);
    }).catch(() => {
      showToast("❌ 复制失败，请手动复制");
    });
  };

  // 复制卡片所有信息
  const handleCopyCardInfo = () => {
    if (!resp?.card) return showToast("暂无卡片信息可复制");
    const info = `卡号: ${resp.card.cardNumber}\nCVV: ${resp.card.cvv}\n有效期: ${resp.card.expiry}`;
    handleCopy(info, "卡片完整信息");
  };

  // 复制完整地址
  const handleCopyAddress = () => {
    const { fullName, street, city, state, zip, country } = MOCK_ADDRESS;
    const addressStr = `${fullName}\n${street}\n${city}, ${state} ${zip}\n${country}`;
    handleCopy(addressStr, "完整账单地址");
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
      showToast("请输入卡密");
      return;
    }

    setLoading(true);
    setError(null);
    setResp(null);

    try {
      const res = await fetch("/api/redeem-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key_id: k.split('\n')[0] }), // 示例仅处理第一行，批量逻辑需后端配合
      });
      const json = (await res.json()) as ApiResp;

      if (!json.ok) {
        showToast(json.error || "激活或查询失败");
        setError(json.error || "请求失败");
      } else {
        setResp(json);
        showToast("✓ 获取成功");
      }
    } catch (e: any) {
      showToast("网络异常");
      setError(e?.message || "网络请求异常");
    } finally {
      setLoading(false);
    }
  };

  // 提取通用信息行组件
  const InfoRow = ({ label, value, valueClass = "text-slate-200" }: { label: string, value: React.ReactNode, valueClass?: string }) => (
    <div className="flex justify-between items-center py-3 border-b border-slate-700/50 last:border-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span className={`text-sm font-medium ${valueClass}`}>{value}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f111a] text-slate-300 font-sans p-4 md:p-6 lg:p-8">
      
      {/* 复制成功 Toast */}
      <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 transform ${toastMsg ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0 pointer-events-none'}`}>
        <div className="bg-[#1e2336] text-white px-6 py-2.5 rounded-lg shadow-xl font-medium text-sm border border-slate-700">
           {toastMsg}
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto h-full flex flex-col lg:flex-row gap-6 lg:h-[calc(100vh-4rem)]">
        
        {/* --- 左侧面板 (输入区) --- */}
        <div className="w-full lg:w-[360px] flex-shrink-0 bg-[#161a2b] rounded-xl border border-slate-800 flex flex-col p-5 shadow-lg">
          {/* Logo & 标题 */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 relative rounded overflow-hidden bg-white shadow-sm flex-shrink-0">
              <Image 
                src="/logo.jpg" 
                alt="智链科技" 
                fill 
                className="object-cover"
              />
            </div>
            <h1 className="text-lg font-bold text-white tracking-wide">智链科技虚拟卡</h1>
          </div>

          {/* 输入框 */}
          <div className="flex-1 flex flex-col mb-4">
            <textarea
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="请输入卡密或卡号（每行一个，最多10个）..."
              className="flex-1 w-full bg-[#0b0e16] text-slate-300 border border-slate-800 rounded-lg p-4 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors resize-none shadow-inner"
            ></textarea>
            
            {error && <div className="text-red-400 text-xs mt-3 text-center">{error}</div>}
          </div>

          {/* 底部操作区 */}
          <div className="text-center">
            <p className="text-xs text-slate-500 mb-3">支持批量兑换，每行输入一个卡密，每个间隔5秒处理</p>
            <button
              onClick={onRedeemAndQuery}
              disabled={loading}
              className="w-full py-3.5 rounded-lg font-bold text-white bg-[#10b981] hover:bg-[#0ea5e9] hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              {loading ? "处理中..." : "兑换 / 查询"}
            </button>
            <div className="text-[10px] text-slate-600 mt-4 uppercase tracking-widest">
              ZhiLianCard • v1.0
            </div>
          </div>
        </div>

        {/* --- 右侧面板 (信息展示区) --- */}
        <div className="flex-1 flex flex-col gap-6 overflow-hidden">
          
          {/* 上半部分: 卡片信息 & 账单地址 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* 1. 卡片信息卡片 */}
            <div className="bg-[#161a2b] rounded-xl border border-slate-800 shadow-lg p-5 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-white font-semibold">卡片信息</h2>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 rounded-md text-xs border border-red-900/50 text-red-400 hover:bg-red-500/10 transition-colors">
                    销毁卡片
                  </button>
                  <button 
                    onClick={handleCopyCardInfo}
                    className="px-3 py-1.5 rounded-md text-xs border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                  >
                    复制卡片信息
                  </button>
                </div>
              </div>

              <div className="flex-1 bg-[#0b0e16] rounded-lg border border-slate-800/80 p-4">
                <InfoRow 
                  label="卡号" 
                  value={displayCardNumber || "--"} 
                  valueClass="font-mono text-white text-base tracking-wider cursor-pointer hover:text-cyan-400" 
                />
                <InfoRow 
                  label="CVV" 
                  value={resp?.card?.cvv || "--"} 
                  valueClass="font-mono" 
                />
                <InfoRow 
                  label="有效期" 
                  value={resp?.card?.expiry || "--"} 
                  valueClass="font-mono"
                />
                <InfoRow 
                  label="剩余时间" 
                  value={resp ? "已过期" : "--"} 
                  valueClass="text-red-400" 
                />
                <InfoRow 
                  label="余额" 
                  value={resp ? "$0" : "--"} 
                  valueClass="text-emerald-400 font-bold" 
                />
                <InfoRow 
                  label="兑换时间" 
                  value={resp?.card?.redeemTime ? formatTime(resp.card.redeemTime) : (resp?.activatedAt ? formatTime(resp.activatedAt) : "--")} 
                />
              </div>
            </div>

            {/* 2. 账单地址卡片 */}
            <div className="bg-[#161a2b] rounded-xl border border-slate-800 shadow-lg p-5 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-white font-semibold">账单地址</h2>
                <button 
                  onClick={handleCopyAddress}
                  className="px-3 py-1.5 rounded-md text-xs border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                >
                  复制完整地址
                </button>
              </div>

              <div className="flex-1 bg-[#0b0e16] rounded-lg border border-slate-800/80 p-4">
                <InfoRow label="全名" value={resp ? MOCK_ADDRESS.fullName : "--"} />
                <InfoRow label="街道" value={resp ? MOCK_ADDRESS.street : "--"} />
                <InfoRow label="城市" value={resp ? MOCK_ADDRESS.city : "--"} />
                <InfoRow label="州/省" value={resp ? MOCK_ADDRESS.state : "--"} />
                <InfoRow label="邮编" value={resp ? MOCK_ADDRESS.zip : "--"} />
                <InfoRow label="国家" value={resp ? MOCK_ADDRESS.country : "--"} />
              </div>
            </div>

          </div>

          {/* 下半部分: 消费记录 */}
          <div className="flex-1 bg-[#161a2b] rounded-xl border border-slate-800 shadow-lg p-5 flex flex-col min-h-[250px]">
            <h2 className="text-white font-semibold mb-4">消费记录</h2>
            
            {/* 数据展示区或空状态 */}
            <div className="flex-1 bg-[#0b0e16] rounded-lg border border-slate-800/80 flex flex-col items-center justify-center">
              <ClipboardIcon />
              <p className="text-slate-500 text-sm">暂无消费记录</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
