'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Question {
  id: number;
  content: string;
  standardAns: string;
  category: string;
  tags: string | null;
}

export default function ManagePage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [importCategory, setImportCategory] = useState('专业课');
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState('');

  const fetchQuestions = (category?: string) => {
    setLoading(true);
    const url = category ? `/api/questions?category=${encodeURIComponent(category)}` : '/api/questions';
    fetch(url)
      .then(res => res.json())
      .then(data => {
        setQuestions(data.questions || []);
        setTotal(data.total || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  // 批量导入
  const handleImport = async () => {
    if (!importText.trim()) return;

    setImporting(true);
    setMessage('');

    try {
      // 解析文本：支持多种格式
      // 格式1：题目和答案用 "---" 分隔，多道题之间用空行分隔
      // 格式2：JSON 数组 [{ content, standardAns }]
      // 格式3：嵌套 JSON { "真题题库": [...] } 或 { "拓展题库": [...] }
      // 格式4：Gemini 输出的带前缀文字的 JSON
      let parsedQuestions: { content: string; standardAns: string; category: string }[] = [];

      // 尝试提取并解析 JSON
      const extractJson = (text: string) => {
        let cleaned = text.trim();

        // 去掉开头的非 JSON 内容（如 "Gemini 说"）
        const jsonStart = cleaned.indexOf('{');
        const arrStart = cleaned.indexOf('[');

        let startIdx = -1;
        if (jsonStart >= 0 && arrStart >= 0) {
          startIdx = Math.min(jsonStart, arrStart);
        } else if (jsonStart >= 0) {
          startIdx = jsonStart;
        } else if (arrStart >= 0) {
          startIdx = arrStart;
        }

        if (startIdx > 0) {
          cleaned = cleaned.substring(startIdx);
        }

        // 如果以 "key": [ 开头（缺少外部 {），自动补全
        if (cleaned.startsWith('"')) {
          cleaned = '{' + cleaned;
        }

        // 去掉末尾可能多余的逗号或文字
        cleaned = cleaned.replace(/,\s*$/, '');

        // 多种解析策略
        const attempts = [
          cleaned,
          cleaned + '}',
          cleaned + ']',
          cleaned + ']}',
          cleaned + '}]}',
          cleaned + ']}',
        ];

        for (const attempt of attempts) {
          try {
            return JSON.parse(attempt);
          } catch { /* continue */ }
        }

        // 最后尝试：找到最后一个完整的 } 或 ] 并截断之后内容
        const lastBrace = cleaned.lastIndexOf('}');
        const lastBracket = cleaned.lastIndexOf(']');
        const lastPos = Math.max(lastBrace, lastBracket);
        if (lastPos > 0) {
          const truncated = cleaned.substring(0, lastPos + 1);
          const tryEndings = ['', '}', ']}'];
          for (const ending of tryEndings) {
            try {
              return JSON.parse(truncated + ending);
            } catch { /* continue */ }
          }
        }

        return null;
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const extractQuestions = (data: any): any[] => {
        if (Array.isArray(data)) {
          return data;
        }
        // 嵌套 JSON：取第一个数组值
        if (typeof data === 'object' && data !== null) {
          for (const key of Object.keys(data)) {
            if (Array.isArray(data[key])) {
              return data[key];
            }
          }
        }
        return [];
      };

      try {
        const json = extractJson(importText);
        if (json) {
          const items = extractQuestions(json);
          if (items.length > 0) {
            parsedQuestions = items.map(q => ({
              content: q.content || q.question || '',
              standardAns: q.standardAns || q.answer || '',
              category: importCategory,
            }));
          }
        }
      } catch { /* fall through */ }

      // 如果 JSON 解析失败，尝试正则提取 content/standardAns 对
      if (parsedQuestions.length === 0 && (importText.includes('"content"') || importText.includes('"standardAns"'))) {
        const regex = /"content"\s*:\s*"((?:[^"\\]|\\.)*)"\s*,\s*"standardAns"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
        let match;
        while ((match = regex.exec(importText)) !== null) {
          parsedQuestions.push({
            content: match[1].replace(/\\"/g, '"').replace(/\\n/g, '\n'),
            standardAns: match[2].replace(/\\"/g, '"').replace(/\\n/g, '\n'),
            category: importCategory,
          });
        }
      }

      // 如果 JSON 解析未成功，使用文本格式解析
      if (parsedQuestions.length === 0) {
        const blocks = importText.split(/\n\s*\n/).filter(b => b.trim());
        parsedQuestions = blocks.map(block => {
          const parts = block.split('---');
          if (parts.length >= 2) {
            return {
              content: parts[0].trim(),
              standardAns: parts.slice(1).join('---').trim(),
              category: importCategory,
            };
          }
          const ansMatch = block.match(/^([\s\S]+?)(?:答案[：:]|Answer[：:])([\s\S]+)$/i);
          if (ansMatch) {
            return {
              content: ansMatch[1].trim(),
              standardAns: ansMatch[2].trim(),
              category: importCategory,
            };
          }
          return { content: block.trim(), standardAns: '暂无标准答案', category: importCategory };
        });
      }

      parsedQuestions = parsedQuestions.filter(q => q.content);

      if (parsedQuestions.length === 0) {
        setMessage('❌ 未解析到有效题目，请检查格式');
        setImporting(false);
        return;
      }

      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: parsedQuestions }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage(`❌ 导入失败: ${data.error || '服务器错误'}`);
      } else {
        setMessage(`✅ ${data.message}`);
        setImportText('');
        fetchQuestions();
      }
    } catch (err) {
      setMessage(`❌ 导入失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <Link href="/" className="back-link">← 返回首页</Link>

      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>📚 题库管理</h2>

      {/* 导入区域 */}
      <div className="card slide-up" style={{ marginBottom: '1.5rem' }}>
        <div className="card-title">📥 导入题目</div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
          支持多种格式：<br />
          <strong>格式一：</strong> 每道题用空行分隔，题目和答案之间用 <code>---</code> 分隔<br />
          <strong>格式二：</strong> JSON 数组 <code>[{`{"content":"题目","standardAns":"答案"}`}]</code><br />
          <strong>格式三：</strong> Gemini 输出的嵌套 JSON（如 <code>{`{"真题题库":[...]}`}</code>，开头有多余文字也没关系）
        </p>

        <div className="import-section">
          <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <label style={{ marginRight: '0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                导入至分类：
              </label>
              <select
                value={importCategory}
                onChange={e => setImportCategory(e.target.value)}
              >
                <option value="专业课">专业课</option>
                <option value="综合素质">综合素质</option>
              </select>
            </div>
            <label className="btn btn-outline" style={{ cursor: 'pointer' }}>
              📂 从文件导入
              <input
                type="file"
                accept=".txt,.json"
                style={{ display: 'none' }}
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      setImportText(ev.target?.result as string || '');
                    };
                    reader.readAsText(file, 'utf-8');
                  }
                  e.target.value = '';
                }}
              />
            </label>
          </div>

          <textarea
            rows={12}
            placeholder={`示例（格式一）：\n\n什么是操作系统？\n---\n操作系统是管理计算机硬件和软件资源的系统软件...\n\n什么是进程和线程的区别？\n---\n进程是资源分配的基本单位，线程是CPU调度的基本单位...`}
            value={importText}
            onChange={e => setImportText(e.target.value)}
          />

          {message && (
            <p style={{
              marginTop: '0.75rem',
              padding: '0.75rem',
              borderRadius: 'var(--radius-sm)',
              background: message.startsWith('✅') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              color: message.startsWith('✅') ? 'var(--success)' : 'var(--danger)',
              fontSize: '0.9rem',
            }}>
              {message}
            </p>
          )}

          <button
            className="btn btn-primary"
            style={{ marginTop: '1rem' }}
            onClick={handleImport}
            disabled={importing || !importText.trim()}
          >
            {importing ? '⏳ 导入中...' : '📤 开始导入'}
          </button>
        </div>
      </div>

      {/* 题目列表 */}
      <div className="card fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div className="card-title" style={{ margin: 0 }}>📋 题目列表（共 {total} 题）</div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="nav-btn" onClick={() => fetchQuestions()}>全部</button>
            <button className="nav-btn" onClick={() => fetchQuestions('专业课')}>专业课</button>
            <button className="nav-btn" onClick={() => fetchQuestions('综合素质')}>综合素质</button>
          </div>
        </div>

        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
          </div>
        ) : questions.length === 0 ? (
          <div className="empty-state" style={{ padding: '2rem' }}>
            <p>暂无题目，请先导入</p>
          </div>
        ) : (
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {questions.map((q, i) => (
              <div key={q.id} style={{
                padding: '0.75rem 1rem',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
              }}>
                <span style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                  minWidth: '2rem',
                  paddingTop: '2px',
                }}>
                  {i + 1}.
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                    {q.content.length > 80 ? q.content.slice(0, 80) + '...' : q.content}
                  </div>
                  <span className={`badge ${q.category === '专业课' ? 'badge-info' : 'badge-warning'}`}>
                    {q.category}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
