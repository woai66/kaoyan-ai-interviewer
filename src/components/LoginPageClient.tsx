'use client';

import Link from 'next/link';
import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

type Mode = 'login' | 'register';

function LoginPageContent() {
  const searchParams = useSearchParams();
  const from = useMemo(() => searchParams.get('from') || '/', [searchParams]);

  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async () => {
    setMessage('');

    if (!email.trim() || !password.trim()) {
      setMessage('请输入邮箱和密码');
      return;
    }

    if (mode === 'register') {
      if (password.length < 8 || !/\d/.test(password)) {
        setMessage('密码至少 8 位，且必须包含数字');
        return;
      }

      if (password !== confirmPassword) {
        setMessage('两次输入的密码不一致');
        return;
      }
    }

    setSubmitting(true);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload = mode === 'login' ? { email, password } : { name, email, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || '操作失败，请重试');
        return;
      }

      window.location.href = from;
    } catch {
      setMessage('网络异常，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <Link href="/" className="back-link">← 返回首页</Link>

      <div className="login-card">
        <div className="login-title">账号登录</div>
        <p className="login-subtitle">
          286 道基础题库已经内置，注册后直接开始抽背与模拟考试。
        </p>

        <div className="login-tabs">
          <button
            className={`nav-btn ${mode === 'login' ? 'active' : ''}`}
            onClick={() => {
              setMode('login');
              setMessage('');
            }}
          >
            登录
          </button>
          <button
            className={`nav-btn ${mode === 'register' ? 'active' : ''}`}
            onClick={() => {
              setMode('register');
              setMessage('');
            }}
          >
            注册
          </button>
        </div>

        {mode === 'register' && (
          <div className="login-field">
            <label>昵称（可选）</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：张三"
            />
          </div>
        )}

        <div className="login-field">
          <label>邮箱</label>
          <input
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="请输入常用邮箱"
          />
        </div>

        <div className="login-field">
          <label>密码</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="至少 8 位，且必须包含数字"
          />
        </div>

        {mode === 'register' && (
          <div className="login-field">
            <label>确认密码</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="请再次输入密码"
            />
          </div>
        )}

        {message && <div className="login-message">{message}</div>}

        <button className="btn btn-primary btn-lg login-submit" onClick={handleSubmit} disabled={submitting}>
          {submitting ? '提交中...' : mode === 'login' ? '登录并开始练习' : '注册并进入系统'}
        </button>

        <p className="login-hint">
          {mode === 'login' ? '还没有账号？切换到注册即可创建。' : '注册成功后会自动登录。'}
        </p>
      </div>
    </div>
  );
}

export default function LoginPageClient() {
  return (
    <Suspense fallback={<div className="loading"><div className="spinner"></div><p>加载中...</p></div>}>
      <LoginPageContent />
    </Suspense>
  );
}
