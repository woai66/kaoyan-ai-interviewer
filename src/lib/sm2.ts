/**
 * SM-2 记忆曲线算法实现
 * 基于 SuperMemo 2 算法，用于间隔重复学习
 * 
 * quality: 回答质量 0-5
 *   0 - 完全不知道
 *   1 - 看到答案后能回忆起来
 *   2 - 模糊
 *   3 - 有些困难但基本正确
 *   4 - 略有犹豫但正确
 *   5 - 完全掌握
 */
export interface SM2Result {
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReview: Date;
}

export function sm2(
  quality: number,       // 0-5 回答质量
  prevEaseFactor: number,   // 上次难度因子
  prevInterval: number,     // 上次间隔(天)
  prevRepetitions: number   // 上次连续正确次数
): SM2Result {
  let easeFactor = prevEaseFactor;
  let interval: number;
  let repetitions: number;

  if (quality >= 3) {
    // 回答正确
    if (prevRepetitions === 0) {
      interval = 1;
    } else if (prevRepetitions === 1) {
      interval = 3;
    } else {
      interval = Math.round(prevInterval * easeFactor);
    }
    repetitions = prevRepetitions + 1;
  } else {
    // 回答错误，重新开始
    interval = 1;
    repetitions = 0;
  }

  // 更新难度因子
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);
  // 设为凌晨0点，确保当天都能复习
  nextReview.setHours(0, 0, 0, 0);

  return { easeFactor, interval, repetitions, nextReview };
}

/**
 * 将用户的操作映射到 SM-2 评分
 * status: 0-不知道, 1-模糊, 2-熟练
 */
export function statusToQuality(status: number): number {
  switch (status) {
    case 0: return 0;  // 不知道 -> 完全忘记
    case 1: return 3;  // 模糊 -> 有些困难但记得
    case 2: return 5;  // 熟练 -> 完全掌握
    default: return 0;
  }
}
