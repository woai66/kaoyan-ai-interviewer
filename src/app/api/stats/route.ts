import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/auth';

// GET: 获取统计数据
export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const totalQuestions = await prisma.question.count();
  const professionalCount = await prisma.question.count({ where: { category: '专业课' } });
  const comprehensiveCount = await prisma.question.count({ where: { category: '综合素质' } });

  const now = new Date();

  // 待复习数量（nextReview <= 今天）
  const dueForReview = await prisma.review.count({
    where: { userId, nextReview: { lte: now } }
  });

  // 各掌握程度分布
  const [mastered, fuzzy, unknown, reviewedCount] = await Promise.all([
    prisma.review.count({ where: { userId, status: 2 } }),
    prisma.review.count({ where: { userId, status: 1 } }),
    prisma.review.count({ where: { userId, status: 0 } }),
    prisma.review.count({ where: { userId } }),
  ]);

  // 还没做过的题
  const notStarted = Math.max(totalQuestions - reviewedCount, 0);

  // 最近考试记录
  const recentExams = await prisma.examRecord.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      totalScore: true,
      createdAt: true,
    }
  });

  return NextResponse.json({
    totalQuestions,
    professionalCount,
    comprehensiveCount,
    dueForReview,
    mastered,
    fuzzy,
    unknown,
    notStarted,
    recentExams,
  });
}
