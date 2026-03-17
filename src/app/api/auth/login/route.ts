import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSession, ensureAdminRole, isValidEmail, normalizeEmail, verifyPassword } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = normalizeEmail(body.email || '');
    const password = body.password || '';

    if (!isValidEmail(email) || !password) {
      return NextResponse.json({ error: '请输入正确的邮箱和密码' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        passwordHash: true,
      },
    });

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: '邮箱或密码错误' }, { status: 401 });
    }

    const role = await ensureAdminRole(user.id, user.email, user.role);
    await createSession(user.id);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role,
      },
      message: '登录成功',
    });
  } catch (error) {
    console.error('登录失败:', error);
    return NextResponse.json({ error: '登录失败，请稍后重试' }, { status: 500 });
  }
}
