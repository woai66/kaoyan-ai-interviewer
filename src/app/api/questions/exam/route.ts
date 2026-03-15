import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: 随机抽取 2 道综合素质题用于模拟考场
export async function GET() {
  const count = await prisma.question.count({
    where: { category: '综合素质' }
  });

  if (count < 2) {
    return NextResponse.json(
      { message: '综合素质题目不足 2 道，请先导入题目' },
      { status: 404 }
    );
  }

  // 随机抽取 2 道不重复的题目
  const allIds = await prisma.question.findMany({
    where: { category: '综合素质' },
    select: { id: true },
  });

  const shuffled = allIds.sort(() => Math.random() - 0.5);
  const selectedIds = shuffled.slice(0, 2).map(q => q.id);

  const questions = await prisma.question.findMany({
    where: { id: { in: selectedIds } },
    include: { reviews: true },
  });

  return NextResponse.json(questions);
}
