/* eslint-disable @typescript-eslint/no-require-imports */
// 用法: node scripts/promote-admin.js <邮箱>

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const email = (process.argv[2] || '').trim().toLowerCase();

  if (!email) {
    console.error('用法: node scripts/promote-admin.js <邮箱>');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, role: true },
  });

  if (!user) {
    console.error(`未找到用户: ${email}`);
    process.exit(1);
  }

  if (user.role === 'admin') {
    console.log(`用户 ${email} 已经是管理员`);
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { role: 'admin' },
  });

  console.log(`已将 ${email} 提升为管理员`);
}

main()
  .catch((error) => {
    console.error('提升管理员失败:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
