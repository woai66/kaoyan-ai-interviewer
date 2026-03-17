'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Stats {
  totalQuestions: number;
  professionalCount: number;
  comprehensiveCount: number;
  dueForReview: number;
  mastered: number;
  fuzzy: number;
  unknown: number;
  notStarted: number;
  recentExams: { id: number; totalScore: number; createdAt: string }[];
}

export default function HomePageClient() {
  const [user, setUser] = useState<{ id: number; role: string } | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadHome() {
      try {
        const meRes = await fetch('/api/auth/me', { credentials: 'include' });
        const meData = await meRes.json();

        if (cancelled) return;

        const currentUser = meData.user || null;
        setUser(currentUser);

        if (!currentUser) {
          setStats(null);
          setLoading(false);
          return;
        }

        const statsRes = await fetch('/api/stats', { credentials: 'include' });
        const statsData = await statsRes.json();

        if (cancelled) return;

        if (statsRes.ok) {
          setStats(statsData);
        } else {
          setStats(null);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
          setStats(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadHome();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>加载中...</p>
      </div>
    );
  }

  const total = stats?.totalQuestions || 0;
  const masteredPct = total > 0 ? ((stats?.mastered || 0) / total * 100) : 0;
  const fuzzyPct = total > 0 ? ((stats?.fuzzy || 0) / total * 100) : 0;
  const canManage = user?.role === 'admin';

  return (
    <>
      <section className="hero-card fade-in">
        <div className="hero-copy">
          <p className="hero-eyebrow">公共基础题库 + 个人学习记录</p>
          <h1>286 道基础题已就绪，登录后直接开始背诵。</h1>
          <p className="hero-desc">
            题库对所有用户共享，复习进度、AI 点评和模拟成绩只属于你自己，彼此不会串数据。
          </p>
          <div className="btn-group">
            <Link href={user ? '/review?category=专业课' : `/login?from=${encodeURIComponent('/review?category=专业课')}`}>
              <button className="btn btn-primary btn-lg">开始真题抽背</button>
            </Link>
            {!user && (
              <Link href="/login">
                <button className="btn btn-outline btn-lg">登录 / 注册</button>
              </Link>
            )}
            {canManage && (
              <Link href="/manage">
                <button className="btn btn-outline btn-lg">管理公共题库</button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {user && (
        <>
          <div className="dashboard-grid fade-in">
            <div className="card stat-card">
              <div className="stat-icon">📖</div>
              <div className="stat-value">{total}</div>
              <div className="stat-label">题库总数</div>
            </div>
            <div className="card stat-card">
              <div className="stat-icon">🔔</div>
              <div className="stat-value">{stats?.dueForReview || 0}</div>
              <div className="stat-label">今日待复习</div>
            </div>
            <div className="card stat-card">
              <div className="stat-icon">✅</div>
              <div className="stat-value">{stats?.mastered || 0}</div>
              <div className="stat-label">已掌握</div>
            </div>
            <div className="card stat-card">
              <div className="stat-icon">🤔</div>
              <div className="stat-value">{stats?.notStarted || 0}</div>
              <div className="stat-label">未开始</div>
            </div>
          </div>

          {total > 0 && (
            <div className="card fade-in" style={{ marginBottom: '2rem' }}>
              <div className="card-title">📊 我的掌握度概览</div>
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                <span className="badge badge-success">✅ 掌握 {stats?.mastered || 0}</span>
                <span className="badge badge-warning">🤔 模糊 {stats?.fuzzy || 0}</span>
                <span className="badge badge-danger">❌ 不知道 {stats?.unknown || 0}</span>
                <span className="badge badge-info">🆕 未开始 {stats?.notStarted || 0}</span>
              </div>
              <div className="progress-bar" style={{ height: '12px' }}>
                <div style={{ display: 'flex', height: '100%', borderRadius: '6px', overflow: 'hidden' }}>
                  <div className="progress-fill mastered" style={{ width: `${masteredPct}%` }}></div>
                  <div className="progress-fill fuzzy" style={{ width: `${fuzzyPct}%` }}></div>
                </div>
              </div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                真题 {stats?.professionalCount || 0} 题 · 拓展题库 {stats?.comprehensiveCount || 0} 题
              </div>
            </div>
          )}
        </>
      )}

      <div className="action-grid slide-up">
        <Link href="/review?category=专业课" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="card action-card review-action">
            <div className="action-icon">📝</div>
            <div className="action-title">真题抽背</div>
            <div className="action-desc">{user ? '基于你的记忆曲线智能抽题，AI 实时评价你的回答' : '登录后开始个人抽背，复习进度不会和别人冲突'}</div>
          </div>
        </Link>
        <Link href="/review?category=综合素质" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="card action-card review-action">
            <div className="action-icon">💡</div>
            <div className="action-title">拓展题库抽背</div>
            <div className="action-desc">练习开放性问答，锻炼综合分析能力</div>
          </div>
        </Link>
        <Link href="/exam" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="card action-card exam-action">
            <div className="action-icon">🎯</div>
            <div className="action-title">模拟考场</div>
            <div className="action-desc">模拟真实面试，两道拓展题库题目，AI 考官打分（满分100）</div>
          </div>
        </Link>
        <Link href="/review?category=专业课&onlyVague=true" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="card action-card error-action">
            <div className="action-icon">🔥</div>
            <div className="action-title">错题本</div>
            <div className="action-desc">集中抽出你标记为「不知道」或「模糊」的题目进行强化复习</div>
          </div>
        </Link>
      </div>

      {!user && (
        <div className="card fade-in" style={{ marginBottom: '2rem' }}>
          <div className="card-title">为什么要登录？</div>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
            登录后系统会把你的复习状态、不会/模糊/掌握标记、AI 点评和模拟考试成绩全部单独保存。
            基础题库是公共共享的，所以新用户不需要重复导入那 286 道题。
          </p>
        </div>
      )}

      {user && stats?.recentExams && stats.recentExams.length > 0 && (
        <div className="card fade-in">
          <div className="card-title">🏆 我的近期模拟成绩</div>
          <div className="exam-history">
            {stats.recentExams.map((exam) => {
              const scoreClass = exam.totalScore >= 80 ? 'badge-success' : exam.totalScore >= 60 ? 'badge-warning' : 'badge-danger';
              return (
                <div key={exam.id} className="exam-history-item">
                  <span>{new Date(exam.createdAt).toLocaleDateString('zh-CN')}</span>
                  <span className={`badge ${scoreClass}`}>{exam.totalScore} 分</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {user && total === 0 && (
        <div className="empty-state fade-in">
          <div className="empty-icon">📭</div>
          <h3>题库还是空的</h3>
          <p style={{ marginBottom: '1.5rem' }}>
            当前公共题库为空，请管理员进入题库管理导入基础题目。
          </p>
          {canManage && (
            <Link href="/manage">
              <button className="btn btn-primary btn-lg">去导入题目 →</button>
            </Link>
          )}
        </div>
      )}
    </>
  );
}
