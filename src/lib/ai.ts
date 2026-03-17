import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.moonshot.cn/v1',
});

/**
 * 评价用户对单道题的回答
 */
export async function evaluateAnswer(
  questionContent: string, 
  standardAnswer: string, 
  userAnswer: string
): Promise<string> {
  const completion = await client.chat.completions.create({
    model: 'moonshot-v1-8k',
    messages: [
      {
        role: 'system',
        content: `你是一位考研复试面试考官，同时也是一位温和但严格的教授。
你的任务是对学生的回答进行评价。请从以下几个维度点评：

1. **回答质量评分** (满分10分)：给出分数和简要理由
2. **亮点**：指出学生回答中好的地方
3. **不足之处**：指出回答中不恰当、不准确或遗漏的内容
4. **知识扩展**：基于这道题，提供一些相关的延伸知识点，帮助学生建立更完善的知识体系

请使用友好、鼓励的语气，但保持评价的客观性。使用 Markdown 格式排版。`
      },
      {
        role: 'user',
        content: `## 题目
${questionContent}

## 标准答案
${standardAnswer}

## 学生回答
${userAnswer}

请对学生的回答进行评价。`
      }
    ],
    temperature: 0.7,
  });

  return completion.choices[0]?.message?.content || '评价生成失败，请重试。';
}

/**
 * 模拟考场模式：综合评分两道拓展题库题目
 */
export async function scoreExam(
  questions: { content: string; standardAnswer: string; userAnswer: string }[]
): Promise<{ score: number; evaluation: string }> {
  const questionsText = questions.map((q, i) => 
    `### 第${i + 1}题
**题目：** ${q.content}
**参考答案：** ${q.standardAnswer}
**学生作答：** ${q.userAnswer}`
  ).join('\n\n');

  const completion = await client.chat.completions.create({
    model: 'moonshot-v1-8k',
    messages: [
      {
        role: 'system',
        content: `你是一位严格的考研复试面试评委组组长。面试环节满分100分，包含两道来自拓展题库、重点考核学生综合素质、创新及应用能力的开放性问答题（每题50分）。

请根据以下评分标准对学生的回答进行综合评分：
- **知识掌握程度** (30%)：对核心概念的理解是否准确
- **逻辑清晰度** (25%)：回答是否有条理、层次分明
- **创新与应用能力** (25%)：是否能联系实际、有独到见解
- **表达与完整性** (20%)：回答是否完整、表述是否流畅

你必须在回答的 **第一行** 给出总分，格式为：\`总分：XX/100\`

然后给出详细评价，包括：
1. 每道题的单独点评与单题得分（各50分满分）
2. 综合评价与改进建议
3. 知识薄弱点分析

使用 Markdown 格式排版。`
      },
      {
        role: 'user',
        content: `以下是学生的面试回答，请进行综合评分：\n\n${questionsText}`
      }
    ],
    temperature: 0.7,
  });

  const content = completion.choices[0]?.message?.content || '';
  
  // 从回答中提取分数
  const scoreMatch = content.match(/总分[：:]\s*(\d+)/);
  const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;

  return { score, evaluation: content };
}
