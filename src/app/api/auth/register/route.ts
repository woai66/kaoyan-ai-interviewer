import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  createSession,
  getRoleForNewUser,
  hashPassword,
  isValidEmail,
  isValidPassword,
  normalizeEmail,
} from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = normalizeEmail(body.email || '');
    const password = body.password || '';
    const name = typeof body.name === 'string' ? body.name.trim() : '';

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: '请输入有效的邮箱地址' }, { status: 400 });
    }

    if (!isValidPassword(password)) {
      return NextResponse.json({ error: '密码至少 8 位，且必须包含数字' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({ error: '该邮箱已注册，请直接登录' }, { status: 409 });
    }

    const role = await getRoleForNewUser(email);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashPassword(password),
        name: name || null,
        role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    await createSession(user.id);

    return NextResponse.json({
      user,
      message: role === 'admin' ? '注册成功，你已成为管理员' : '注册成功',
    });
  } catch (error) {
    console.error('注册失败:', error);
    return NextResponse.json({ error: '注册失败，请稍后重试' }, { status: 500 });
  }
}
