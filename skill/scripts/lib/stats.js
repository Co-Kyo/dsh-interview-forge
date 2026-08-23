'use strict';

/**
 * InterviewForge 统计纯模块（Wave1-B1 自 render-report.cjs 平移）
 *
 * - computeDimensionScores / computeNarrativeRiskStats / computeRiskSummary /
 *   computeChoiceStats / computeHighRiskQuestionCount 及其私有依赖
 *   （getCognitionTag / cognitionLabelMap / getCognitionLabel / riskBadgeClass /
 *   HIGH_RISK_TAGS）忠实平移自 skill/scripts/render-report.cjs（:61-191），
 *   行为与现状逐字对齐，含 fallback 兼容怪癖；渲染侧本波仍保留同名副本，
 *   重复为暂态，S1 收敛后由渲染侧改为 require 本模块。
 * - band() 为本波新增：high ≥80 / mid ≥60 / low <60；非数字或缺失 → 'low'。
 *
 * 接缝契约（design/L4 §2）：CommonJS，只依赖入参对象，无 IO、无全局态。
 */

// ---- 认知状态标签 ----
function getCognitionTag(q) {
  return q.cognitionTag || '';
}

// 英文→中文标签映射
const cognitionLabelMap = {
  'genuine': '真懂',
  'partial': '半懂',
  'half': '半懂',
  'blind': '不会',
  'surface': '表面懂',
  'fuzzy': '模糊',
  'inflated': '虚高',
};

function getCognitionLabel(q) {
  const raw = getCognitionTag(q);
  return cognitionLabelMap[raw] || raw;
}

function riskBadgeClass(risk) {
  const high = ['过度推断', '不懂装懂', '版本盲区'];
  if (high.includes(risk)) return 'risk-high';
  return 'risk-mid';
}

// ---- 计算维度得分 ----
function computeDimensionScores(data) {
  if (Array.isArray(data.dimensions) && data.dimensions.length > 0 && typeof data.dimensions[0].score === 'number') {
    return data.dimensions.map(d => ({ name: d.name, score: d.score }));
  }
  return [];
}
// ---- 计算叙事风险统计 ----
function computeNarrativeRiskStats(data) {
  const riskCounts = {};
  data.questions.forEach(q => {
    (q.narrativeRisks || []).forEach(r => {
      riskCounts[r] = (riskCounts[r] || 0) + 1;
    });
  });

  const badges = [];
  for (const [risk, count] of Object.entries(riskCounts)) {
    badges.push({ risk, count, cls: riskBadgeClass(risk) });
  }
  // 按数量降序
  badges.sort((a, b) => b.count - a.count);
  return badges;
}

// ---- 计算面试风险总结 ----
function computeRiskSummary(data) {
  const highRisks = [];
  const midRisks = [];

  data.questions.forEach(q => {
    (q.narrativeRisks || []).forEach(risk => {
      const entry = { risk, evidence: q.evidence, id: q.id };
      if (['过度推断', '不懂装懂', '版本盲区'].includes(risk)) {
        highRisks.push(entry);
      } else {
        midRisks.push(entry);
      }
    });
  });

  // 去重聚合
  const riskGroups = {};
  [...highRisks, ...midRisks].forEach(({ risk, evidence, id }) => {
    if (!riskGroups[risk]) riskGroups[risk] = { risk, isHigh: highRisks.some(h => h.risk === risk), items: [] };
    riskGroups[risk].items.push({ id, evidence });
  });

  return Object.values(riskGroups);
}

// ---- 计算选择题正确数 ----
// 事实来源：questions[].isCorrect（选择题由归因按 result.selected === quiz.answer 判定）。
// 禁止用 userAnswer/correctAnswer 文本比较推导（两者是带评注的叙述，永远不可能全等）。
// 兼容旧数据（无 isCorrect）：回退到 overall.correct / overall.totalQuestions，并标记 fallback。
function computeChoiceStats(data) {
  const questions = data.questions || [];
  const hasFact = questions.some(q => typeof q.isCorrect === 'boolean');
  if (hasFact) {
    const choices = questions.filter(q => q.type === 'choice' || typeof q.isCorrect === 'boolean');
    const choiceCount = choices.length;
    const correctCount = choices.filter(q => q.isCorrect === true).length;
    return { correctCount, totalCount: choiceCount, fallback: false };
  }
  const total = data.overall?.totalQuestions || questions.length || 0;
  return { correctCount: data.overall?.correct || 0, totalCount: total, fallback: true };
}

// ---- 叙事高风险题数（按题去重：一题多个高风险标签只计 1） ----
const HIGH_RISK_TAGS = ['过度推断', '不懂装懂', '版本盲区'];
function computeHighRiskQuestionCount(data) {
  return (data.questions || []).filter(q =>
    (q.narrativeRisks || []).some(r => HIGH_RISK_TAGS.includes(r))
  ).length;
}

// ---- 分数档位（本波新增）----
// high ≥80 / mid ≥60 / low <60；非数字或缺失 → 'low'。
// Number.isFinite 一并挡下 NaN/Infinity（NaN 虽 typeof 'number' 但不可作分数比较）。
function band(score) {
  if (typeof score !== 'number' || !Number.isFinite(score)) return 'low';
  if (score >= 80) return 'high';
  if (score >= 60) return 'mid';
  return 'low';
}

module.exports = {
  getCognitionTag,
  cognitionLabelMap,
  getCognitionLabel,
  riskBadgeClass,
  HIGH_RISK_TAGS,
  computeDimensionScores,
  computeNarrativeRiskStats,
  computeRiskSummary,
  computeChoiceStats,
  computeHighRiskQuestionCount,
  band,
};
