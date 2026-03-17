'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Question {
  id: number;
  content: string;
  standardAns: string;
}

export default function ExamPage() {
  const [phase, setPhase] = useState<'start' | 'answering' | 'submitting' | 'result'>('start');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<string[]>(['', '']);
  const [currentQ, setCurrentQ] = useState(0);
  const [result, setResult] = useState<{ score: number; evaluation: string } | null>(null);
  const [error, setError] = useState('');

  const redirectToLogin = () => {
    const target = `/login?from=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    window.location.href = target;
  };

  // 开始考试：抽取两道题
  const startExam = async () => {
    setError('');
    try {
      const res = await fetch('/api/questions/exam', { credentials: 'include' });
      const data = await res.json();

      if (res.status === 401) {
        redirectToLogin();
        return;
      }

      if (data.message) {
        setError(data.message);
        return;
      }

      setQuestions(data);
      setAnswers(['', '']);
      setCurrentQ(0);
      setPhase('answering');
    } catch {
      setError('获取题目失败，请检查网络');
    }
  };

  // 提交考试
  const submitExam = async () => {
    if (answers.some(a => !a.trim())) {
      setError('请回答完所有题目');
      return;
    }

    setPhase('submitting');
    setError('');

    try {
      const res = await fetch('/api/ai/score-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          questions: questions.map((q, i) => ({
            id: q.id,
            content: q.content,
            standardAnswer: q.standardAns,
            userAnswer: answers[i],
          })),
        }),
      });

      const data = await res.json();
      if (res.status === 401) {
        redirectToLogin();
        return;
      }
      if (data.error) {
        setError(data.error);
        setPhase('answering');
        return;
      }

      setResult(data);
      setPhase('result');
    } catch {
      setError('提交失败，请重试');
      setPhase('answering');
    }
  };

  // 开始页面
  if (phase === 'start') {
    return (
      <>
        <Link href="/" className="back-link">← 返回首页</Link>

        <div className="card slide-up" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🎯</div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '1rem' }}>
            模拟考场
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', maxWidth: '500px', margin: '0 auto 1.5rem' }}>
            模拟真实考研复试专业面试环节<br />
            系统将随机抽取 <strong>2 道拓展题库题目</strong>，你需要依次作答<br />
            全部作答完毕后，AI 考官将给出综合评分（满分100分）
          </p>

          <div style={{
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            borderRadius: 'var(--radius-sm)',
            padding: '1rem',
            margin: '1.5rem auto',
            maxWidth: '400px',
            fontSize: '0.9rem',
            color: 'var(--warning)',
          }}>
            ⚠️ 答题过程中无法查看标准答案
          </div>

          {error && (
            <p style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</p>
          )}

          <button className="btn btn-primary btn-lg" onClick={startExam}>
            🚀 开始模拟面试
          </button>
        </div>
      </>
    );
  }

  // 作答页面
  if (phase === 'answering') {
    return (
      <>
        <Link href="/" className="back-link">← 返回首页</Link>

        {/* 进度指示 */}
        <div style={{
          display: 'flex',
          gap: '0.75rem',
          marginBottom: '1.5rem',
          justifyContent: 'center',
        }}>
          {[0, 1].map(i => (
            <div
              key={i}
              onClick={() => setCurrentQ(i)}
              style={{
                padding: '0.5rem 1.5rem',
                borderRadius: 'var(--radius-sm)',
                background: currentQ === i ? 'var(--primary)' : 'var(--bg-glass)',
                color: currentQ === i ? 'white' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: 600,
                border: `1px solid ${currentQ === i ? 'var(--primary)' : 'var(--border)'}`,
                transition: 'all 0.2s',
              }}
            >
              第{i + 1}题 {answers[i].trim() ? '✓' : ''}
            </div>
          ))}
        </div>

        {/* 当前题目 */}
        <div className="card question-card slide-up" key={currentQ}>
          <div className="question-number">
            📌 第{currentQ + 1}题 / 共2题 · 拓展题库（50分）
          </div>
          <div className="question-content">{questions[currentQ]?.content}</div>
        </div>

        <div className="card slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="answer-section">
            <label>✏️ 你的回答</label>
            <textarea
              rows={8}
              placeholder="请认真作答，模拟真实面试场景..."
              value={answers[currentQ]}
              onChange={e => {
                const newAnswers = [...answers];
                newAnswers[currentQ] = e.target.value;
                setAnswers(newAnswers);
              }}
            />
          </div>

          {error && (
            <p style={{ color: 'var(--danger)', marginTop: '0.75rem' }}>{error}</p>
          )}

          <div className="btn-group" style={{ marginTop: '1rem', justifyContent: 'space-between' }}>
            <div>
              {currentQ > 0 && (
                <button className="btn btn-outline" onClick={() => { setCurrentQ(0); setError(''); }}>
                  ← 上一题
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {currentQ === 0 ? (
                <button
                  className="btn btn-primary"
                  onClick={() => { setCurrentQ(1); setError(''); }}
                  disabled={!answers[0].trim()}
                >
                  下一题 →
                </button>
              ) : (
                <button
                  className="btn btn-success btn-lg"
                  onClick={submitExam}
                  disabled={answers.some(a => !a.trim())}
                >
                  📤 提交试卷并获取评分
                </button>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  // 提交中
  if (phase === 'submitting') {
    return (
      <div className="loading" style={{ minHeight: '60vh' }}>
        <div className="spinner" style={{ width: '60px', height: '60px' }}></div>
        <p style={{ fontSize: '1.1rem', marginTop: '1rem' }}>🤖 AI 考官正在评阅你的试卷...</p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>这可能需要 10-20 秒</p>
      </div>
    );
  }

  // 结果页面
  if (phase === 'result' && result) {
    const scoreClass = result.score >= 80 ? 'score-high' :
      result.score >= 60 ? 'score-mid' : 'score-low';

    return (
      <>
        <Link href="/" className="back-link">← 返回首页</Link>

        <div className="score-display slide-up">
          <div className={`score-circle ${scoreClass}`}>
            {result.score}
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            {result.score >= 80 ? '🎉 优秀！' :
             result.score >= 60 ? '👍 良好！继续加油！' : '💪 加油！多多练习！'}
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>满分 100 分</p>
        </div>

        {/* 详细评价 */}
        <div className="card fade-in" style={{ marginBottom: '1.5rem' }}>
          <div className="card-title">🤖 AI 考官综合评价</div>
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, color: 'var(--text-secondary)' }}>
            {result.evaluation}
          </div>
        </div>

        {/* 题目与回答回顾 */}
        {questions.map((q, i) => (
          <div className="card fade-in" key={q.id} style={{ marginBottom: '1rem' }}>
            <div className="question-number">📌 第{i + 1}题</div>
            <div className="question-content" style={{ marginBottom: '1rem' }}>{q.content}</div>
            <div style={{
              background: 'rgba(99, 102, 241, 0.08)',
              borderRadius: 'var(--radius-sm)',
              padding: '1rem',
              marginBottom: '0.75rem',
            }}>
              <strong style={{ color: 'var(--primary-light)' }}>你的回答：</strong>
              <div style={{ whiteSpace: 'pre-wrap', marginTop: '0.5rem' }}>{answers[i]}</div>
            </div>
            <div className="standard-answer">
              <h4>📗 参考答案</h4>
              <div style={{ whiteSpace: 'pre-wrap' }}>{q.standardAns}</div>
            </div>
          </div>
        ))}

        <div className="btn-group" style={{ justifyContent: 'center', marginTop: '2rem' }}>
          <button className="btn btn-primary btn-lg" onClick={() => {
            setPhase('start');
            setResult(null);
            setQuestions([]);
            setAnswers(['', '']);
            setError('');
          }}>
            🔄 再来一次
          </button>
          <Link href="/">
            <button className="btn btn-outline btn-lg">🏠 返回首页</button>
          </Link>
        </div>
      </>
    );
  }

  return null;
}
