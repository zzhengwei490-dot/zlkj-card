import type { Metadata } from "next";
import "./globals.css"; // 引入下面的样式文件

export const metadata: Metadata = {
  title: "智链科技 · 激活终端",
  description: "SmartChain Tech Activation Portal",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      {/* antialiased 让字体在暗色背景下更清晰 */}
      <body className="antialiased">{children}</body>
    </html>
  );
}
