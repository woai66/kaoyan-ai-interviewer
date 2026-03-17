import type { Metadata } from "next";
import "./globals.css";
import Link from 'next/link';
import AuthHeader from '@/components/AuthHeader';

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
          <header className="global-header">
            <div className="global-header-spacer" aria-hidden="true" />
            <div className="global-header-left">
              <Link href="/" className="global-title">
                考研复试模拟考官
              </Link>
              <nav className="global-nav">
                <Link href="/" className="nav-btn">首页</Link>
                <Link href="/review?category=专业课" className="nav-btn">真题抽背</Link>
                <Link href="/exam" className="nav-btn">模拟考场</Link>
              </nav>
            </div>
            <AuthHeader />
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
