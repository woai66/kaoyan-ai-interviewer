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

  const [question, setQuestion] = useState<Question | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [aiEvaluation, setAiEvaluation] = useState('');
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [submittedStatus, setSubmittedStatus] = useState<number | null>(null);

  const fetchQuestion = useCallback(() => {
    setLoading(true);
    setShowAnswer(false);
    setUserAnswer('');
    setAiEvaluation('');
    setSubmittedStatus(null);

    fetch(`/api/questions/review?category=${encodeURIComponent(category)}`)
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
  }, [category]);

  useEffect(() => {
    fetchQuestion();
  }, [fetchQuestion]);

  // 提交回答并获取 AI 评价
  const handleSubmit = async () => {
    if (!question || !userAnswer.trim()) return;

    setEvaluating(true);
    setShowAnswer(true);

    try {
      // 并行：获取 AI 评价 + 更新复习状态
      const [aiRes] = await Promise.all([
        fetch('/api/ai/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questionContent: question.content,
            standardAnswer: question.standardAns,
            userAnswer: userAnswer,
          }),
        }),
      ]);

      const aiData = await aiRes.json();
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
  };

  // 标记掌握程度并进入下一题
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
    // 短暂延迟后进入下一题
    setTimeout(() => fetchQuestion(), 500);
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>正在抽背题目...</p>
      </div>
    );
  }

  if (!question) {
    return (
      <>
        <Link href="/" className="back-link">← 返回首页</Link>
        <div className="empty-state">
          <div className="empty-icon">🎉</div>
          <h3>暂无{category}待复习的题目</h3>
          <p>所有题目都复习完毕，或题库为空。</p>
          <Link href="/manage">
            <button className="btn btn-primary" style={{ marginTop: '1rem' }}>去导入题目</button>
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Link href="/" className="back-link">← 返回首页</Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
          {category === '专业课' ? '📝' : '💡'} {category}抽背练习
        </h2>
      </div>

      {/* 题目展示 */}
      <div className="card question-card slide-up">
        <div className="question-number">
          📌 题目 #{question.id}
          {question.reviews?.[0] && (
            <span className={`badge ${
              question.reviews[0].status === 2 ? 'badge-success' :
              question.reviews[0].status === 1 ? 'badge-warning' : 'badge-danger'
            }`} style={{ marginLeft: '0.5rem' }}>
              {question.reviews[0].status === 2 ? '已掌握' :
               question.reviews[0].status === 1 ? '模糊' : '待复习'}
            </span>
          )}
        </div>
        <div className="question-content">{question.content}</div>
      </div>

      {/* 回答区域 */}
      {!showAnswer && (
        <div className="card slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="answer-section">
            <label>✏️ 你的回答</label>
            <textarea
              rows={6}
              placeholder={'输入你的回答...（也可以点击"不知道"直接查看标准答案）'}
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
            />
          </div>
          <div className="btn-group" style={{ marginTop: '1rem' }}>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={!userAnswer.trim()}>
              📤 提交回答并获取AI点评
            </button>
            <button className="btn btn-danger" onClick={handleDontKnow}>
              🤷 不知道，直接看答案
            </button>
          </div>
        </div>
      )}

      {/* 标准答案 */}
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
              <div>{aiEvaluation}</div>
            </div>
          )}

          {/* 掌握度评价 */}
          {submittedStatus === null && (
            <div className="card fade-in" style={{ marginTop: '1.5rem' }}>
              <div className="card-title">你觉得这道题掌握得怎么样？</div>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                你的评价将影响这道题下次出现的时间（记忆曲线）
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

          {submittedStatus !== null && (
            <div className="loading fade-in" style={{ marginTop: '1rem' }}>
              <div className="spinner"></div>
              <p>正在加载下一题...</p>
            </div>
          )}
        </div>
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
