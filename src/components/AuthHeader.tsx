'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface CurrentUser {
  id: number;
  email: string;
  name: string | null;
  role: string;
}

export default function AuthHeader() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        setUser(data.user || null);
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      window.location.href = '/';
    } finally {
      setLoggingOut(false);
    }
  };

  if (loading) {
    return <div className="auth-loading auth-panel">登录状态加载中...</div>;
  }

  if (!user) {
    return (
      <div className="auth-header auth-panel auth-guest-panel">
        <span className="auth-guest-text">还未登录</span>
        <Link href="/login" className="nav-btn auth-guest-btn">登录 / 注册</Link>
      </div>
    );
  }

  const displayName = user.name?.trim() || user.email;
  const avatarText = displayName.slice(0, 1).toUpperCase();

  return (
    <div className="auth-header auth-panel">
      <div className="auth-user-chip">
        <div className="auth-avatar">{avatarText}</div>
        <div className="auth-user-meta">
          <div className="auth-user-name">{displayName}</div>
          <div className="auth-user-role">{user.role === 'admin' ? '管理员账号' : '个人账号'}</div>
        </div>
      </div>
      <div className="auth-actions">
        {user.role === 'admin' && (
          <Link href="/manage" className="nav-btn auth-manage-btn">
            题库管理
          </Link>
        )}
        <button className="btn btn-outline auth-logout-btn" onClick={handleLogout} disabled={loggingOut}>
          {loggingOut ? '退出中...' : '退出登录'}
        </button>
      </div>
    </div>
  );
}
