import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: 获取待复习的题目（基于记忆曲线）
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || '专业课';
  const mode = searchParams.get('mode') || 'sm2';
  const lastId = parseInt(searchParams.get('lastId') || '0', 10);
  const onlyVague = searchParams.get('onlyVague') === 'true';
  
  const now = new Date();

  // 基础过滤条件
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const baseWhere: any = { category };
  
  if (onlyVague) {
    baseWhere.reviews = {
      some: {
        status: { in: [0, 1] }
      }
    };
  }

  if (mode === 'sequential') {
    const question = await prisma.question.findFirst({
      where: { ...baseWhere, id: { gt: lastId } },
      include: { reviews: true },
      orderBy: { id: 'asc' },
    });
    if (question) return NextResponse.json(question);
    
    // 如果走到结尾了，如果是从中间开始的，可能需要给个提示。
    return NextResponse.json({ message: '没有更多题目了，请重新开始' });
  }

  if (mode === 'random' || onlyVague) {
    const count = await prisma.question.count({ where: baseWhere });
    if (count === 0) {
      return NextResponse.json({ message: '没有找到符合条件的题目' });
    }
    const skip = Math.floor(Math.random() * count);
    const random = await prisma.question.findFirst({
      where: baseWhere,
      include: { reviews: true },
      skip,
    });
    return NextResponse.json(random);
  }

  // 以下是 sm2 模式逻辑
  // 优先获取需要复习的题目（nextReview <= 当前时间）
  const reviewDue = await prisma.question.findFirst({
    where: {
      category,
      reviews: {
        some: {
          nextReview: { lte: now }
        }
      }
    },
    include: { reviews: true },
    orderBy: { reviews: { _count: 'asc' } }
  });

  if (reviewDue) {
    return NextResponse.json(reviewDue);
  }

  // 没有待复习的，获取还没有复习记录的新题
  const newQuestion = await prisma.question.findFirst({
    where: {
      category,
      reviews: { none: {} }
    },
    include: { reviews: true },
  });

  if (newQuestion) {
    return NextResponse.json(newQuestion);
  }

  // 所有题目都复习过且没有到期的，随机抽一题
  const count = await prisma.question.count({ where: { category } });
  if (count === 0) {
    return NextResponse.json({ message: '题库为空，请先导入题目' }, { status: 404 });
  }
  const skip = Math.floor(Math.random() * count);
  const random = await prisma.question.findFirst({
    where: { category },
    include: { reviews: true },
    skip,
  });

  return NextResponse.json(random);
}
