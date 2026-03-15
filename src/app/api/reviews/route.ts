import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sm2, statusToQuality } from '@/lib/sm2';

// POST: 更新题目复习状态（记忆曲线）
export async function POST(request: Request) {
  const body = await request.json();
  const { questionId, status, userAnswer } = body;
  // status: 0-不知道, 1-模糊, 2-熟练

  if (!questionId || status === undefined) {
    return NextResponse.json({ error: '缺少参数' }, { status: 400 });
  }

  const quality = statusToQuality(status);

  // 查找现有的复习记录
  const existing = await prisma.review.findUnique({
    where: { questionId }
  });

  const prevEF = existing?.easeFactor || 2.5;
  const prevInterval = existing?.interval || 0;
  const prevReps = existing?.repetitions || 0;

  const result = sm2(quality, prevEF, prevInterval, prevReps);

  const review = await prisma.review.upsert({
    where: { questionId },
    update: {
      status,
      easeFactor: result.easeFactor,
      interval: result.interval,
      repetitions: result.repetitions,
      nextReview: result.nextReview,
      lastAnswer: userAnswer || null,
    },
    create: {
      questionId,
      status,
      easeFactor: result.easeFactor,
      interval: result.interval,
      repetitions: result.repetitions,
      nextReview: result.nextReview,
      lastAnswer: userAnswer || null,
    }
  });

  return NextResponse.json(review);
}
