/**
 * lib/stats.js 单测（L0 层，Wave1-B1）
 *
 * 用例数据形状复刻 scripts/render-report.e2e.cjs 的 fixtureA / C / D：
 *   A. 选择题正确数来自 isCorrect 事实字段，分母不含开放题
 *   C. 叙事高风险题按题去重（一题多个高风险标签只计 1）
 *   D. 旧数据（无 isCorrect）回退到 overall.correct / overall.totalQuestions
 * 另覆盖 band() 边界与认知标签映射。零外部依赖：node:test + node:assert。
 *
 * 注：本文件位于仓库根 package.json 的 "type": "module" 辖区，用 ESM 语法；
 * 被测模块 skill/scripts/lib/stats.js 是 CommonJS（由 skill/scripts/lib/package.json
 * 钉住格式），ESM 命名导入其 module.exports。
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  band,
  computeChoiceStats,
  computeDimensionScores,
  computeHighRiskQuestionCount,
  computeNarrativeRiskStats,
  computeRiskSummary,
  getCognitionLabel,
  getCognitionTag,
} from '../../skill/scripts/lib/stats.js';

// ---- fixtures（形状对齐 render-report.e2e.cjs）----

function fixtureA() {
  return {
    sessionId: 'if-20260819-015627',
    title: 'Vue 响应式原理速练（补答）',
    quizMeta: { title: 'Vue 响应式原理速练（补答）', totalQuestions: 5 },
    overall: { score: 60, totalQuestions: 5, answered: 5, correct: 3 },
    dimensions: [{ name: '依赖收集', score: 50 }, { name: '响应式API', score: 70 }],
    questions: [
      { id: 'q01', type: 'choice', category: '依赖收集', stem: 'q01', userAnswer: 'D ❌（…）', correctAnswer: 'B ✅ …', isCorrect: false, cognitionTag: '不会', evidence: '用户原话：…', narrativeRisks: ['术语错误', '过度推断'] },
      { id: 'q02', type: 'choice', category: '响应式API', stem: 'q02', userAnswer: 'C ✅（…）', correctAnswer: 'C ✅ …', isCorrect: true, cognitionTag: '半懂', evidence: '用户原话：…', narrativeRisks: ['过度推断'] },
      { id: 'q03', type: 'choice', category: '依赖收集', stem: 'q03', userAnswer: 'D ✅（…）', correctAnswer: 'D ✅ …', isCorrect: true, cognitionTag: '真懂', evidence: '用户原话：…', narrativeRisks: [] },
      { id: 'q04', type: 'choice', category: '响应式API', stem: 'q04', userAnswer: 'A ✅（…）', correctAnswer: 'A ✅ …', isCorrect: true, cognitionTag: '真懂', evidence: '用户原话：…', narrativeRisks: [] },
      // 开放题：无 type==='choice'、无 isCorrect → 不进分母
      { id: 'q05', type: 'open', category: '依赖收集', stem: 'q05', userAnswer: '从 setup 初始化…', correctAnswer: '要点：…', cognitionTag: '半懂', evidence: '用户原话：…', narrativeRisks: ['术语错误', '模糊措辞'] },
    ],
    actions: [],
  };
}

function fixtureC() {
  return {
    sessionId: 'if-20260819-015627',
    title: 'T',
    quizMeta: { title: 'T', totalQuestions: 2 },
    overall: { score: 50, totalQuestions: 2, answered: 2, correct: 1 },
    dimensions: [],
    questions: [
      { id: 'q01', type: 'choice', stem: 'q01', userAnswer: 'A', correctAnswer: 'B', isCorrect: false, cognitionTag: '不会', evidence: 'e', narrativeRisks: ['过度推断', '版本盲区'] },
      { id: 'q02', type: 'choice', stem: 'q02', userAnswer: 'B', correctAnswer: 'B', isCorrect: true, cognitionTag: '真懂', evidence: 'e', narrativeRisks: ['过度推断'] },
    ],
    actions: [],
  };
}

function fixtureD() {
  return {
    sessionId: 'if-20260819-000000',
    title: 'T2',
    quizMeta: { title: 'T2', totalQuestions: 5 },
    overall: { score: 60, totalQuestions: 5, answered: 5, correct: 3 },
    dimensions: [],
    questions: [
      { id: 'q01', category: 'c', stem: 'q01', userAnswer: 'D ❌（…）', correctAnswer: 'B ✅ …', cognitionTag: '不会', evidence: 'e' },
      { id: 'q02', category: 'c', stem: 'q02', userAnswer: 'C ✅（…）', correctAnswer: 'C ✅ …', cognitionTag: '半懂', evidence: 'e' },
      { id: 'q03', category: 'c', stem: 'q03', userAnswer: 'D ✅（…）', correctAnswer: 'D ✅ …', cognitionTag: '真懂', evidence: 'e' },
      { id: 'q04', category: 'c', stem: 'q04', userAnswer: 'A ✅（…）', correctAnswer: 'A ✅ …', cognitionTag: '真懂', evidence: 'e' },
      { id: 'q05', category: 'c', stem: 'q05', userAnswer: '…', correctAnswer: '…', cognitionTag: '半懂', evidence: 'e' },
    ],
    actions: [],
  };
}

// ---- A/B：computeChoiceStats ----

test('computeChoiceStats fixtureA：isCorrect 事实路径，分母不含开放题', () => {
  assert.deepEqual(computeChoiceStats(fixtureA()), { correctCount: 3, totalCount: 4, fallback: false });
});

test('computeChoiceStats fixtureC：2 道选择题 1 对', () => {
  assert.deepEqual(computeChoiceStats(fixtureC()), { correctCount: 1, totalCount: 2, fallback: false });
});

test('computeChoiceStats fixtureD：无 isCorrect 回退 overall.correct/totalQuestions 并标记 fallback', () => {
  const r = computeChoiceStats(fixtureD());
  assert.deepEqual(r, { correctCount: 3, totalCount: 5, fallback: true });
});

test('computeChoiceStats 回退怪癖保持：overall 缺失时 correct=0、分母落到 questions.length', () => {
  const d = fixtureD();
  delete d.overall;
  assert.deepEqual(computeChoiceStats(d), { correctCount: 0, totalCount: 5, fallback: true });
  assert.deepEqual(
    computeChoiceStats({ questions: [] }),
    { correctCount: 0, totalCount: 0, fallback: true }
  );
});

// ---- computeDimensionScores ----

test('computeDimensionScores fixtureA：原样透出 name/score', () => {
  assert.deepEqual(computeDimensionScores(fixtureA()), [
    { name: '依赖收集', score: 50 },
    { name: '响应式API', score: 70 },
  ]);
});

test('computeDimensionScores：空数组/缺失/首项非数字 → []', () => {
  assert.deepEqual(computeDimensionScores({ dimensions: [] }), []);
  assert.deepEqual(computeDimensionScores({}), []);
  assert.deepEqual(computeDimensionScores({ dimensions: [{ name: 'x', score: '50' }] }), []);
});

// ---- computeNarrativeRiskStats ----

test('computeNarrativeRiskStats fixtureA：按出现次数计数并降序，高风险标签 cls=risk-high', () => {
  const badges = computeNarrativeRiskStats(fixtureA());
  // 术语错误×2、过度推断×2、模糊措辞×1；插入序稳定（术语错误先于过度推断）
  assert.deepEqual(badges.map(b => [b.risk, b.count]), [['术语错误', 2], ['过度推断', 2], ['模糊措辞', 1]]);
  const byRisk = Object.fromEntries(badges.map(b => [b.risk, b.cls]));
  assert.equal(byRisk['过度推断'], 'risk-high');
  assert.equal(byRisk['术语错误'], 'risk-mid');
  assert.equal(byRisk['模糊措辞'], 'risk-mid');
});

test('computeNarrativeRiskStats fixtureC：风险计数不去重（按出现次数），高风险 cls 正确', () => {
  const badges = computeNarrativeRiskStats(fixtureC());
  assert.deepEqual(badges.map(b => [b.risk, b.count]), [['过度推断', 2], ['版本盲区', 1]]);
  assert.ok(badges.every(b => b.cls === 'risk-high'));
});

test('computeNarrativeRiskStats：缺 narrativeRisks 视为空；缺 questions 按现状抛错', () => {
  assert.deepEqual(computeNarrativeRiskStats({ questions: [{ id: 'q1' }] }), []);
  // 忠实平移：render-report.cjs 对 data.questions 不设防（schema 必填 questions），
  // 缺失时 TypeError 是现状行为，本波不修。
  assert.throws(() => computeNarrativeRiskStats({}), TypeError);
});

test('computeRiskSummary：缺 narrativeRisks 视为空；缺 questions 同样按现状抛错', () => {
  assert.deepEqual(computeRiskSummary({ questions: [{ id: 'q1', narrativeRisks: [] }] }), []);
  assert.throws(() => computeRiskSummary({}), TypeError);
});

// ---- computeRiskSummary ----

test('computeRiskSummary fixtureC：同题多标签去重聚合到同一组，items 按题保留', () => {
  const groups = computeRiskSummary(fixtureC());
  assert.equal(groups.length, 2);
  const over = groups.find(g => g.risk === '过度推断');
  assert.ok(over.isHigh);
  // q01 的「过度推断」+ q02 的「过度推断」聚为一组；q01 的「版本盲区」单独一组
  assert.deepEqual(over.items.map(i => i.id), ['q01', 'q02']);
  assert.deepEqual(over.items.map(i => i.evidence), ['e', 'e']);
  const ver = groups.find(g => g.risk === '版本盲区');
  assert.ok(ver.isHigh);
  assert.deepEqual(ver.items.map(i => i.id), ['q01']);
});

test('computeRiskSummary fixtureA：高风险组排前、mid 组 isHigh=false 且保序', () => {
  const groups = computeRiskSummary(fixtureA());
  assert.deepEqual(groups.map(g => g.risk), ['过度推断', '术语错误', '模糊措辞']);
  assert.ok(groups[0].isHigh);
  assert.equal(groups[1].isHigh, false);
  assert.equal(groups[2].isHigh, false);
  assert.deepEqual(groups[1].items.map(i => i.id), ['q01', 'q05']);
});

test('computeRiskSummary：无 risks 返回空数组', () => {
  assert.deepEqual(computeRiskSummary({ questions: [{ id: 'q1', narrativeRisks: [] }] }), []);
});

// ---- computeHighRiskQuestionCount ----

test('computeHighRiskQuestionCount fixtureA：q01、q02 均含过度推断 → 2', () => {
  // 注意：fixtureA 中 q01 与 q02 都带「过度推断」，与 e2e A 组只断言渲染数字不同，
  // 此处按现状行为断言 2。
  assert.equal(computeHighRiskQuestionCount(fixtureA()), 2);
});

test('computeHighRiskQuestionCount fixtureC：q01 两标签计 1 + q02 计 1 → 2（按题去重）', () => {
  assert.equal(computeHighRiskQuestionCount(fixtureC()), 2);
});

test('computeHighRiskQuestionCount fixtureD：无 narrativeRisks → 0；questions 缺失 → 0', () => {
  assert.equal(computeHighRiskQuestionCount(fixtureD()), 0);
  assert.equal(computeHighRiskQuestionCount({}), 0);
});

// ---- band ----

test('band 边界：80→high、79→mid、60→mid、59→low', () => {
  assert.equal(band(80), 'high');
  assert.equal(band(79), 'mid');
  assert.equal(band(60), 'mid');
  assert.equal(band(59), 'low');
});

test('band 端点：100→high、0→low', () => {
  assert.equal(band(100), 'high');
  assert.equal(band(0), 'low');
});

test('band 非数字或缺失 → low（undefined/null/字符串数字/NaN）', () => {
  assert.equal(band(undefined), 'low');
  assert.equal(band(null), 'low');
  assert.equal(band('85'), 'low');   // 字符串数字不算数字
  assert.equal(band(''), 'low');
  assert.equal(band(NaN), 'low');
});

test('band 对象缺 score 时按 low 兜底（模拟维度条调用形态）', () => {
  const d = { name: '维度', score: undefined };
  assert.equal(band(d.score), 'low');
});

// ---- 认知标签私有依赖 ----

test('getCognitionTag/getCognitionLabel：英文映射、未知原样透出、缺失空串', () => {
  assert.equal(getCognitionTag({ cognitionTag: 'genuine' }), 'genuine');
  assert.equal(getCognitionLabel({ cognitionTag: 'genuine' }), '真懂');
  assert.equal(getCognitionLabel({ cognitionTag: 'half' }), '半懂');
  assert.equal(getCognitionLabel({ cognitionTag: 'blind' }), '不会');
  assert.equal(getCognitionLabel({ cognitionTag: '理解精准' }), '理解精准'); // 中文不在映射表，原样透出
  assert.equal(getCognitionLabel({}), '');
});
