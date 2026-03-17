import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/auth';

// GET: 随机抽取 2 道拓展题库题目用于模拟考场
export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const count = await prisma.question.count({
    where: { category: '综合素质' }
  });

  if (count < 2) {
    return NextResponse.json(
      { message: '拓展题库题目不足 2 道，请先导入题目' },
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
  });

  return NextResponse.json(questions);
}
