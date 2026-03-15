import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: 获取统计数据
export async function GET() {
  const totalQuestions = await prisma.question.count();
  const professionalCount = await prisma.question.count({ where: { category: '专业课' } });
  const comprehensiveCount = await prisma.question.count({ where: { category: '综合素质' } });

  const now = new Date();

  // 待复习数量（nextReview <= 今天）
  const dueForReview = await prisma.review.count({
    where: { nextReview: { lte: now } }
  });

  // 各掌握程度分布
  const mastered = await prisma.review.count({ where: { status: 2 } });
  const fuzzy = await prisma.review.count({ where: { status: 1 } });
  const unknown = await prisma.review.count({ where: { status: 0 } });

  // 还没做过的题
  const notStarted = totalQuestions - mastered - fuzzy - unknown;

  // 最近考试记录
  const recentExams = await prisma.examRecord.findMany({
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
