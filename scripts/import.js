/* eslint-disable @typescript-eslint/no-require-imports */
// 直接从文件导入题库到数据库的脚本（容错版）
// 用法: node scripts/import.js <文件路径> [分类]
// 例如: node scripts/import.js "C:\Users\zyq\Desktop\真题题库.txt" 专业课

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

function extractQuestions(raw) {
  const questions = [];
  
  // 方法1: 尝试标准 JSON 解析
  try {
    let cleaned = raw.trim();
    const jsonStart = cleaned.indexOf('{');
    if (jsonStart > 0) cleaned = cleaned.substring(jsonStart);
    if (cleaned.startsWith('"')) cleaned = '{' + cleaned;
    cleaned = cleaned.replace(/,\s*$/, '');
    
    const tryParse = [cleaned, cleaned + '}', cleaned + ']', cleaned + ']}'];
    for (const attempt of tryParse) {
      try {
        const parsed = JSON.parse(attempt);
        const arr = Array.isArray(parsed) ? parsed : Object.values(parsed).find(v => Array.isArray(v));
        if (arr && arr.length > 0) {
          console.log('✅ 标准 JSON 解析成功');
          return arr;
        }
      } catch { /* continue */ }
    }
  } catch { /* fall through to regex */ }

  console.log('⚠️ 标准 JSON 解析失败，使用正则提取...');

  // 方法2: 用正则逐个提取 content + standardAns 对
  // 匹配模式: "content": "xxx", "standardAns": "yyy"
  const regex = /"content"\s*:\s*"((?:[^"\\]|\\.)*)"\s*,\s*"standardAns"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  let match;
  while ((match = regex.exec(raw)) !== null) {
    questions.push({
      content: match[1].replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\'),
      standardAns: match[2].replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\'),
    });
  }

  if (questions.length > 0) {
    console.log(`✅ 正则提取成功: ${questions.length} 题`);
    return questions;
  }

  // 方法3: 更宽松的正则 - 处理 standardAns 中包含未转义引号的情况
  console.log('⚠️ 严格正则失败，尝试宽松匹配...');
  
  // 按 {"content" 或 { "content" 分割每个题目块
  const blocks = raw.split(/\{\s*\r?\n\s*"content"/);
  
  for (let i = 1; i < blocks.length; i++) {
    const block = '"content"' + blocks[i];
    
    // 提取 content
    const contentMatch = block.match(/"content"\s*:\s*"([^"]+)"/);
    if (!contentMatch) continue;
    
    // 提取 standardAns - 从 "standardAns": " 到下一个 "\n} 或 "\r\n}
    const ansMatch = block.match(/"standardAns"\s*:\s*"([\s\S]*?)"\s*\r?\n\s*\}/);
    
    questions.push({
      content: contentMatch[1],
      standardAns: ansMatch ? ansMatch[1] : '暂无标准答案',
    });
  }

  console.log(`✅ 宽松匹配提取: ${questions.length} 题`);
  return questions;
}

async function main() {
  const filePath = process.argv[2];
  const category = process.argv[3] || '专业课';

  if (!filePath) {
    console.error('用法: node scripts/import.js <文件路径> [分类]');
    process.exit(1);
  }

  const fullPath = path.resolve(filePath);
  console.log(`📂 读取文件: ${fullPath}`);
  console.log(`📁 分类: ${category}`);

  const raw = fs.readFileSync(fullPath, 'utf-8');
  console.log(`📄 文件大小: ${raw.length} 字符`);

  const questions = extractQuestions(raw);

  if (!questions || questions.length === 0) {
    console.error('❌ 未找到任何题目');
    process.exit(1);
  }

  // 过滤有效题目
  const validQuestions = questions
    .filter(q => q.content && q.content.trim())
    .map(q => ({
      content: q.content.trim(),
      standardAns: (q.standardAns || '暂无标准答案').trim(),
      category: category,
      tags: null,
    }));

  console.log(`📝 有效题目数: ${validQuestions.length}`);
  console.log(`📝 前 3 题预览:`);
  validQuestions.slice(0, 3).forEach((q, i) => {
    console.log(`  ${i + 1}. ${q.content.substring(0, 50)}...`);
  });

  // 分批导入（每批 50 题）
  const batchSize = 50;
  let totalImported = 0;

  for (let i = 0; i < validQuestions.length; i += batchSize) {
    const batch = validQuestions.slice(i, i + batchSize);
    const result = await prisma.question.createMany({ data: batch });
    totalImported += result.count;
    console.log(`  ✅ 批次 ${Math.floor(i / batchSize) + 1}: 导入 ${result.count} 题 (累计: ${totalImported})`);
  }

  console.log(`\n🎉 完成！共导入 ${totalImported} 道题到「${category}」分类`);
}

main()
  .catch(e => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
