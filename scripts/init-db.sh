#!/bin/bash
# 首次部署时执行：请先在 .env 中配置正确的 DATABASE_URL（MySQL 用户名与密码）
# 然后以 MySQL 管理员身份创建数据库，例如：
#   mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS kaoyan_interviewer CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
# 再在项目根目录执行：
#   npx prisma db push

set -e
cd "$(dirname "$0")/.."
echo "生成 Prisma Client..."
npx prisma generate
echo "推送 schema 到数据库（需 .env 中 DATABASE_URL 正确）..."
npx prisma db push
echo "数据库初始化完成。"
