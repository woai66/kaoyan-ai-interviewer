import { NextResponse } from 'next/server';
import { scoreExam } from '@/lib/ai';
import { prisma } from '@/lib/prisma';

// POST: 模拟考场综合评分
export async function POST(request: Request) {
  try {
    const { questions } = await request.json();
    // questions: [{ id, content, standardAnswer, userAnswer }]

    if (!questions || questions.length !== 2) {
      return NextResponse.json({ error: '需要两道题目' }, { status: 400 });
    }

    const result = await scoreExam(questions);

    // 保存考试记录
    const record = await prisma.examRecord.create({
      data: {
        questions: JSON.stringify(questions),
        totalScore: result.score,
        aiEvaluation: result.evaluation,
      }
    });

    return NextResponse.json({
      id: record.id,
      score: result.score,
      evaluation: result.evaluation,
    });
  } catch (error) {
    console.error('模拟考场评分失败:', error);
    return NextResponse.json(
      { error: 'AI 评分服务暂时不可用，请检查 API Key 配置' },
      { status: 500 }
    );
  }
}
