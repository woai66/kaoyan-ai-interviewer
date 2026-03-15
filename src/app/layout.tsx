import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "考研复试面试模拟考官 | 智能抽背与AI评分",
  description: "基于AI的考研复试面试模拟训练系统，集成记忆曲线、智能评分、知识扩展等功能",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="app-container">
          {children}
        </div>
      </body>
    </html>
  );
}
