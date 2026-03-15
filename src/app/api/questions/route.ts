import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: 获取所有题目（分页）
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '50');

  const where = category ? { category } : {};

  const [questions, total] = await Promise.all([
    prisma.question.findMany({
      where,
      include: { reviews: true },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { id: 'asc' },
    }),
    prisma.question.count({ where }),
  ]);

  return NextResponse.json({ questions, total, page, pageSize });
}

// POST: 批量导入题目
export async function POST(request: Request) {
  const body = await request.json();
  const { questions } = body;
  // questions: [{ content, standardAns, category?, tags? }]

  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    return NextResponse.json({ error: '请提供题目数组' }, { status: 400 });
  }

  const created = await prisma.question.createMany({
    data: questions.map((q: { content: string; standardAns: string; category?: string; tags?: string }) => ({
      content: q.content,
      standardAns: q.standardAns,
      category: q.category || '专业课',
      tags: q.tags || null,
    })),
  });

  return NextResponse.json({ count: created.count, message: `成功导入 ${created.count} 道题目` });
}

// DELETE: 清空某个类别的题目
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');

  if (category) {
    await prisma.question.deleteMany({ where: { category } });
    return NextResponse.json({ message: `已清空 ${category} 类题目` });
  }

  return NextResponse.json({ error: '请指定要清空的类别' }, { status: 400 });
}
