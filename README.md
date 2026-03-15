# 考研复试 AI 面试官

基于 Next.js + Prisma + MySQL 的考研复试面试题抽背与 AI 评价应用。支持抽题背诵、输入答案后查看标准答案、接入大模型评价与知识扩展，以及 SM-2 记忆曲线复习。

## 功能特性

- **抽题背诵**：从真题/拓展题库中随机抽题，支持按分类筛选
- **答题与对照**：输入你的答案后可查看标准答案；也可点击「不知道」直接看答案
- **AI 评价**：接入大模型（默认月之暗面），对回答进行评分、指出亮点与不足、并做知识扩展
- **记忆曲线**：采用 SM-2 算法，标记「不知道」的题目在后续复习中更常出现
- **模拟考场**：连续多题作答后，由 AI 给出综合评分与评价
- **题库管理**：支持导入真题与拓展题库（见 `scripts/import.js`）

## 技术栈

- **前端 / 全栈**：Next.js 16、React 19
- **数据库**：MySQL，ORM 为 Prisma
- **AI**：OpenAI 兼容 API（默认月之暗面 Moonshot，可配置其他厂商）

## 快速开始

### 环境要求

- Node.js 18+
- MySQL 5.7+ / 8.x
- npm / pnpm / yarn

### 1. 克隆项目

```bash
git clone https://github.com/woai66/kaoyan-ai-interviewer.git
cd kaoyan-ai-interviewer
```

### 2. 安装依赖

```bash
npm install
```

### 3. 环境变量

复制示例配置并按需修改：

```bash
cp .env.example .env
```

在 `.env` 中填写：

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | MySQL 连接串，如 `mysql://用户名:密码@localhost:3306/kaoyan_interviewer` |
| `OPENAI_API_KEY` | 大模型 API Key（月之暗面 / DeepSeek / OpenAI 等） |
| `OPENAI_BASE_URL` | 可选，API 基地址；不填则默认月之暗面 |

### 4. 数据库初始化

```bash
# 在 MySQL 中创建数据库（请替换为你的密码）
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS kaoyan_interviewer CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 同步表结构
npx prisma db push
```

或执行脚本（需已配置好 `.env`）：

```bash
bash scripts/init-db.sh
```

### 5. 启动开发服务器

```bash
npm run dev
```

浏览器访问 [http://localhost:3000](http://localhost:3000)。

### 6. 导入题库（可选）

使用项目自带的导入脚本，将真题/拓展题导入数据库，用法见 `scripts/import.js` 内注释或说明。

---

## 生产部署

生产环境构建与进程管理：

```bash
npm run build
npm run start
```

使用 PM2 常驻运行（端口等见 `ecosystem.config.cjs`）：

```bash
npx pm2 start ecosystem.config.cjs
```

更详细的服务器部署步骤（Nginx、域名、HTTPS 等）见 **[DEPLOY.md](./DEPLOY.md)**。

---

## Git 协作流程（推荐）

推荐使用 **「分支 + Pull Request（PR）合并到主分支」** 的方式协作，避免直接在 `main`/`master` 上改代码。

### 1. 主分支约定

- 主分支名称：`main` 或 `master`，作为可发布/稳定代码。
- 所有新功能、修复都在**新分支**上完成，再通过 PR 合并回主分支。

### 2. 标准流程

```bash
# 1. 确保主分支是最新的（若主分支叫 main）
git checkout main
git pull origin main

# 若主分支叫 master，则：
# git checkout master
# git pull origin master

# 2. 从主分支新建功能/修复分支（分支名要有含义）
git checkout -b feature/xxx    # 新功能，如 feature/add-voice-input
# 或
git checkout -b fix/xxx       # 修复，如 fix/login-error

# 3. 在分支上开发、提交
# ... 修改代码 ...
git add .
git commit -m "feat: 简短描述本次修改"

# 4. 推送到远程（首次推送需设置上游）
git push -u origin feature/xxx

# 5. 在 GitHub 上打开 Pull Request
#    从 feature/xxx 合并到 main（或 master），填写标题和说明，请他人 Review（如有）

# 6. 合并后，可删除本地分支并拉取最新 main
git checkout main
git pull origin main
git branch -d feature/xxx
```

### 3. 提交信息建议

- `feat: 新功能描述`
- `fix: 修复问题描述`
- `chore: 构建/配置/文档等`
- `docs: 仅文档修改`

### 4. 为何推荐分支 + PR

- **主分支保持可发布**：未完成或未审核的代码不会直接进主分支。
- **便于 Code Review**：PR 上可讨论、留评论，再合并。
- **历史清晰**：每个 PR 对应一个功能或修复，便于回溯。
- **减少冲突**：多人协作时各做各分支，再合并，冲突更可控。

### 5. 若你 Fork 本仓库

1. 在 GitHub 上 Fork `woai66/kaoyan-ai-interviewer` 到你自己的账号。
2. 克隆你 Fork 出来的仓库，添加 upstream 指向原仓库（可选，用于同步原仓库更新）：

   ```bash
   git clone https://github.com/你的用户名/kaoyan-ai-interviewer.git
   cd kaoyan-ai-interviewer
   git remote add upstream https://github.com/woai66/kaoyan-ai-interviewer.git
   ```

3. 在你的 Fork 里按上面「标准流程」新建分支、提交、推送，然后在 **你的 Fork 的 GitHub 页面** 创建 PR，若需贡献回原仓库，再向原仓库提 PR。

---

## 项目结构概览

```
├── prisma/
│   └── schema.prisma    # 数据模型（题目、复习记录、考试记录等）
├── scripts/
│   ├── import.js        # 题库导入脚本
│   └── init-db.sh       # 数据库初始化脚本
├── src/
│   ├── app/             # Next.js App Router 页面与 API
│   └── lib/             # 公共逻辑（Prisma、AI、SM-2 等）
├── .env.example         # 环境变量示例
├── ecosystem.config.cjs # PM2 配置
├── DEPLOY.md            # 服务器部署说明
└── README.md            # 本文件
```

## 参考链接

- [Next.js 文档](https://nextjs.org/docs)
- [Prisma 文档](https://www.prisma.io/docs)
