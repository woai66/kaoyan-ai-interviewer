import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sm2, statusToQuality } from '@/lib/sm2';
import { getCurrentUserId } from '@/lib/auth';

// POST: 更新题目复习状态（记忆曲线）
export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const body = await request.json();
  const { questionId, status, userAnswer, aiEvaluation } = body;
  // status: 0-不知道, 1-模糊, 2-熟练

  if (!questionId || status === undefined || ![0, 1, 2].includes(status)) {
    return NextResponse.json({ error: '缺少参数' }, { status: 400 });
  }

  const question = await prisma.question.findUnique({
    where: { id: Number(questionId) },
    select: { id: true },
  });

  if (!question) {
    return NextResponse.json({ error: '题目不存在' }, { status: 404 });
  }

  const quality = statusToQuality(status);

  // 查找现有的复习记录
  const existing = await prisma.review.findUnique({
    where: {
      userId_questionId: {
        userId,
        questionId: Number(questionId),
      },
    }
  });

  const prevEF = existing?.easeFactor || 2.5;
  const prevInterval = existing?.interval || 0;
  const prevReps = existing?.repetitions || 0;

  const result = sm2(quality, prevEF, prevInterval, prevReps);

  const review = await prisma.review.upsert({
    where: {
      userId_questionId: {
        userId,
        questionId: Number(questionId),
      },
    },
    update: {
      status,
      easeFactor: result.easeFactor,
      interval: result.interval,
      repetitions: result.repetitions,
      nextReview: result.nextReview,
      lastAnswer: userAnswer || null,
      lastAiReview: aiEvaluation || null,
    },
    create: {
      userId,
      questionId: Number(questionId),
      status,
      easeFactor: result.easeFactor,
      interval: result.interval,
      repetitions: result.repetitions,
      nextReview: result.nextReview,
      lastAnswer: userAnswer || null,
      lastAiReview: aiEvaluation || null,
    }
  });

  return NextResponse.json(review);
}
