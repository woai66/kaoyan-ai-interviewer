'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Question {
  id: number;
  content: string;
  standardAns: string;
  category: string;
  reviews: { status: number; nextReview: string }[];
}

function ReviewContent() {
  const searchParams = useSearchParams();
  const category = searchParams.get('category') || '专业课';
  const onlyVague = searchParams.get('onlyVague') === 'true';

  const [mode, setMode] = useState<'sm2' | 'sequential' | 'random'>('sm2');
  const [lastId, setLastId] = useState(0);

  const [question, setQuestion] = useState<Question | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [aiEvaluation, setAiEvaluation] = useState('');
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [submittedStatus, setSubmittedStatus] = useState<number | null>(null);
  const [showNextBtn, setShowNextBtn] = useState(false);

  const fetchQuestion = useCallback(() => {
    setLoading(true);
    setShowAnswer(false);
    setUserAnswer('');
    setAiEvaluation('');
    setSubmittedStatus(null);
    setShowNextBtn(false);

    const url = `/api/questions/review?category=${encodeURIComponent(category)}&mode=${mode}&lastId=${lastId}${onlyVague ? '&onlyVague=true' : ''}`;
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.message) {
          setQuestion(null);
        } else {
          setQuestion(data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [category, mode, lastId, onlyVague]);

  useEffect(() => {
    fetchQuestion();
  }, [fetchQuestion]);

  // 提交回答并获取 AI 评价
  const handleSubmit = async () => {
    if (!question || !userAnswer.trim()) return;

    setEvaluating(true);
    setShowAnswer(true);

    try {
      const res = await fetch('/api/ai/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionContent: question.content,
          standardAnswer: question.standardAns,
          userAnswer: userAnswer,
        }),
      });

      const aiData = await res.json();
      setAiEvaluation(aiData.evaluation || aiData.error || '评价获取失败');
    } catch {
      setAiEvaluation('AI 评价暂时不可用');
    } finally {
      setEvaluating(false);
    }
  };

  // 点击"不知道"
  const handleDontKnow = async () => {
    if (!question) return;
    setShowAnswer(true);

    await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: question.id, status: 0 }),
    });
    setSubmittedStatus(0);
    setShowNextBtn(true);
  };

  // 标记掌握程度
  const handleRate = async (status: number) => {
    if (!question) return;

    await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: question.id,
        status,
        userAnswer: userAnswer || undefined,
      }),
    });
    setSubmittedStatus(status);
    setShowNextBtn(true);
  };

  const handleNext = () => {
    if (question) {
      if (mode === 'sequential') {
        setLastId(question.id);
      } else {
        // 如果是其他模式，只要强制重新加载 fetch 就可以了。
        // 因为 useCallback 的限制，如果 mode/lastId 不变，不会刷新。我们可以加个时间戳 hack 或显式调用。
        fetchQuestion();
      }
    }
  };

  // 改变模式时重置
  const handleModeChange = (newMode: 'sm2' | 'sequential' | 'random') => {
    setMode(newMode);
    setLastId(0);
  };

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ width: '100%', textAlign: 'left' }}>
          <Link href="/" className="back-link" style={{ marginBottom: 0 }}>← 返回首页</Link>
        </div>

        {/* 模式选择 */}
        {!onlyVague && (
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.5rem', background: 'var(--bg-card)', padding: '0.3rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <button className={`nav-btn ${mode === 'sm2' ? 'active' : ''}`} onClick={() => handleModeChange('sm2')}>
              🧠 智能分布
            </button>
            <button className={`nav-btn ${mode === 'sequential' ? 'active' : ''}`} onClick={() => handleModeChange('sequential')}>
              1️⃣ 顺序
            </button>
            <button className={`nav-btn ${mode === 'random' ? 'active' : ''}`} onClick={() => handleModeChange('random')}>
              🎲 随机
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
          {category === '专业课' ? '📝' : '💡'} {category}抽背 {onlyVague && <span style={{ color: 'var(--danger)', fontSize: '1rem' }}>(错题复习)</span>}
        </h2>
      </div>

      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
          <p>正在拉取题目...</p>
        </div>
      ) : !question ? (
        <div className="empty-state">
          <div className="empty-icon">🎉</div>
          <h3>暂无{category}待复习的题目</h3>
          <p>{onlyVague ? '恭喜，没有错题！' : '所有题目都复习完毕，或题库为空。'}</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
            <button className="btn btn-outline" onClick={() => fetchQuestion()}>🔄 重新尝试拉取</button>
            <Link href="/manage">
              <button className="btn btn-primary">去导入题目</button>
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* 题目展示 */}
          <div className="card question-card slide-up">
            <div className="question-number">
              📌 题目 #{question.id}
              {question.reviews?.[0] && (
                <span className={`badge ${question.reviews[0].status === 2 ? 'badge-success' :
                  question.reviews[0].status === 1 ? 'badge-warning' : 'badge-danger'
                  }`} style={{ marginLeft: '0.5rem' }}>
                  上次评价: {question.reviews[0].status === 2 ? '已掌握' :
                    question.reviews[0].status === 1 ? '模糊' : '不会'}
                </span>
              )}
            </div>
            <div className="question-content">{question.content}</div>
          </div>

          {/* 回答区域 */}
          {!showAnswer && (
            <div className="card slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="answer-section" style={{ marginTop: 0 }}>
                <label>✏️ 你的回答</label>
                <textarea
                  rows={5}
                  placeholder={'输入你的回答...（也可以点击"不知道"直接查看标准答案）'}
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                />
              </div>
              <div className="btn-group" style={{ marginTop: '1.5rem' }}>
                <button className="btn btn-primary" onClick={handleSubmit} disabled={!userAnswer.trim()}>
                  📤 提交回答，让 AI 评价
                </button>
                <button className="btn btn-danger" onClick={handleDontKnow}>
                  🤷‍♂️ 不知道，直接看答案
                </button>
              </div>
            </div>
          )}

          {/* 标准答案与结果 */}
          {showAnswer && (
            <div className="slide-up">
              <div className="standard-answer">
                <h4>📗 标准答案</h4>
                <div style={{ whiteSpace: 'pre-wrap' }}>{question.standardAns}</div>
              </div>

              {/* AI 评价 */}
              {evaluating && (
                <div className="loading" style={{ marginTop: '1rem' }}>
                  <div className="spinner"></div>
                  <p>🤖 AI 考官正在评价你的回答...</p>
                </div>
              )}

              {aiEvaluation && (
                <div className="ai-evaluation fade-in">
                  <h4>🤖 AI 考官点评</h4>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{aiEvaluation}</div>
                </div>
              )}

              {/* 掌握度评价 (未评价之前) */}
              {submittedStatus === null && !evaluating && (
                <div className="card fade-in" style={{ marginTop: '1.5rem', borderColor: 'var(--primary)' }}>
                  <div className="card-title">评价这道题掌握得怎么样？</div>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                    你的真实评价将决定这道题下次出现的时机
                  </p>
                  <div className="btn-group">
                    <button className="btn btn-danger" onClick={() => handleRate(0)}>
                      ❌ 不会
                    </button>
                    <button className="btn btn-warning" onClick={() => handleRate(1)}>
                      🤔 模糊
                    </button>
                    <button className="btn btn-success" onClick={() => handleRate(2)}>
                      ✅ 掌握
                    </button>
                  </div>
                </div>
              )}

              {/* 已评价后的下一题按钮 */}
              {showNextBtn && (
                <div className="fade-in" style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                  <button className="btn btn-primary btn-lg" onClick={handleNext} style={{ width: '100%', maxWidth: '300px' }}>
                    ➡ 下一题
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}

export default function ReviewPage() {
  return (
    <Suspense fallback={<div className="loading"><div className="spinner"></div><p>加载中...</p></div>}>
      <ReviewContent />
    </Suspense>
  );
}
