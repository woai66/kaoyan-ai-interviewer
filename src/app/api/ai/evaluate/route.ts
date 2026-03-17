import { NextResponse } from 'next/server';
import { evaluateAnswer } from '@/lib/ai';
import { getCurrentUserId } from '@/lib/auth';

// POST: AI 评价单题回答
export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { questionContent, standardAnswer, userAnswer } = await request.json();

    if (!questionContent || !standardAnswer || !userAnswer) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    }

    const evaluation = await evaluateAnswer(questionContent, standardAnswer, userAnswer);

    return NextResponse.json({ evaluation });
  } catch (error) {
    console.error('AI 评价失败:', error);
    if (
      error &&
      typeof error === 'object' &&
      'status' in error &&
      Number(error.status) === 429
    ) {
      return NextResponse.json(
        { error: 'AI 服务当前较忙，请稍后重试单题点评' },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { error: 'AI 评价服务暂时不可用，请检查 API Key 配置' },
      { status: 500 }
    );
  }
}
