/* eslint-disable @typescript-eslint/no-require-imports */
// 用法: node scripts/reset-password.js <邮箱> <新密码>

const { randomBytes, scryptSync } = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

async function main() {
  const email = (process.argv[2] || '').trim().toLowerCase();
  const password = process.argv[3] || '';

  if (!email || !password) {
    console.error('用法: node scripts/reset-password.js <邮箱> <新密码>');
    process.exit(1);
  }

  if (password.length < 8 || !/\d/.test(password)) {
    console.error('新密码至少 8 位，且必须包含数字');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });

  if (!user) {
    console.error(`未找到用户: ${email}`);
    process.exit(1);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: hashPassword(password) },
  });

  await prisma.session.deleteMany({
    where: { userId: user.id },
  });

  console.log(`已重置 ${email} 的密码，并使旧登录会话失效`);
}

main()
  .catch((error) => {
    console.error('重置密码失败:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
