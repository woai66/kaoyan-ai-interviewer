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

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => { setStats(data); setLoading(false); })
      .catch(() => setLoading(false));
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

  return (
    <>
      <header className="header">
        <h1>🎓 考研复试模拟考官</h1>
        <nav>
          <Link href="/manage" className="nav-btn">📚 题库管理</Link>
        </nav>
      </header>

      {/* 统计卡片 */}
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

      {/* 掌握度进度条 */}
      {total > 0 && (
        <div className="card fade-in" style={{ marginBottom: '2rem' }}>
          <div className="card-title">📊 掌握度概览</div>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            <span className="badge badge-success">✅ 掌握 {stats?.mastered || 0}</span>
            <span className="badge badge-warning">🤔 模糊 {stats?.fuzzy || 0}</span>
            <span className="badge badge-danger">❌ 不知道 {stats?.unknown || 0}</span>
            <span className="badge badge-info">🆕 未开始 {stats?.notStarted || 0}</span>
          </div>
          <div className="progress-bar" style={{ height: '12px' }}>
            <div style={{
              display: 'flex',
              height: '100%',
              borderRadius: '6px',
              overflow: 'hidden'
            }}>
              <div className="progress-fill mastered" style={{ width: `${masteredPct}%` }}></div>
              <div className="progress-fill fuzzy" style={{ width: `${fuzzyPct}%` }}></div>
            </div>
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            专业课 {stats?.professionalCount || 0} 题 · 综合素质 {stats?.comprehensiveCount || 0} 题
          </div>
        </div>
      )}

      <div className="action-grid slide-up">
        <Link href="/review?category=专业课" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="card action-card review-action">
            <div className="action-icon">📝</div>
            <div className="action-title">专业课抽背</div>
            <div className="action-desc">基于记忆曲线智能抽题，AI 实时评价你的回答</div>
          </div>
        </Link>
        <Link href="/review?category=综合素质" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="card action-card review-action">
            <div className="action-icon">💡</div>
            <div className="action-title">综合素质抽背</div>
            <div className="action-desc">练习开放性问答，锻炼综合分析能力</div>
          </div>
        </Link>
        <Link href="/exam" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="card action-card exam-action">
            <div className="action-icon">🎯</div>
            <div className="action-title">模拟考场</div>
            <div className="action-desc">模拟真实面试，两道综合素质题，AI 考官打分（满分100）</div>
          </div>
        </Link>
        <Link href="/review?category=专业课&onlyVague=true" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="card action-card error-action">
            <div className="action-icon">🔥</div>
            <div className="action-title">专业课错题本</div>
            <div className="action-desc">集中抽出你标记为「不知道」或「模糊」的题目进行强化复习</div>
          </div>
        </Link>
      </div>

      {/* 最近考试记录 */}
      {stats?.recentExams && stats.recentExams.length > 0 && (
        <div className="card fade-in">
          <div className="card-title">🏆 近期模拟成绩</div>
          <div className="exam-history">
            {stats.recentExams.map(exam => {
              const scoreClass = exam.totalScore >= 80 ? 'badge-success' :
                exam.totalScore >= 60 ? 'badge-warning' : 'badge-danger';
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

      {/* 空状态 */}
      {total === 0 && (
        <div className="empty-state fade-in">
          <div className="empty-icon">📭</div>
          <h3>题库还是空的</h3>
          <p style={{ marginBottom: '1.5rem' }}>点击右上角「题库管理」导入你的真题题库，开始练习吧！</p>
          <Link href="/manage">
            <button className="btn btn-primary btn-lg">去导入题目 →</button>
          </Link>
        </div>
      )}
    </>
  );
}
