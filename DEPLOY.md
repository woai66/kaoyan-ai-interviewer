# 服务器部署说明

## 1. 环境变量

复制 `.env.example` 为 `.env` 并填写：

- **DATABASE_URL**：MySQL 连接串，例如  
  `mysql://用户名:密码@localhost:3306/kaoyan_interviewer`
- **OPENAI_API_KEY**：大模型 API Key（月之暗面/DeepSeek 等）
- **OPENAI_BASE_URL**（可选）：不填则默认月之暗面 API

## 2. 数据库初始化

在 `.env` 中配置好正确的 MySQL 账号后：

```bash
# 以 MySQL 管理员身份创建数据库（请替换为你的 root 密码）
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS kaoyan_interviewer CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 在项目根目录执行
npx prisma db push
```

或执行脚本（需先配置好 `.env`）：

```bash
bash scripts/init-db.sh
```

## 3. 启动方式

- 应用默认使用 **端口 3001**（因本机 3000 已被占用）。
- 开发：`npm run dev`
- 生产构建：`npm run build` → `npm run start`
- 使用 PM2：`npx pm2 start ecosystem.config.cjs`（已配置 PORT=3001）

## 4. Nginx 与域名

已配置：`hizyq.cn`、`www.hizyq.cn` 反代到本机 **3001** 端口，配置文件为 `/www/server/panel/vhost/nginx/hizyq.cn.conf`。如需 HTTPS，可用 certbot 为 hizyq.cn 申请证书并在该 server 中增加 `listen 443 ssl` 及证书路径。
