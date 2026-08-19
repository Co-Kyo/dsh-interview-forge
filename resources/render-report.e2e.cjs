#!/usr/bin/env node
/**
 * render-report.cjs 统计正确性 E2E 回归测试
 *
 * 覆盖（每个都是曾出现或易回归的 bug）：
 *   A. 选择题正确数必须来自 isCorrect 事实字段（禁止 userAnswer/correctAnswer 文本比较 → 恒 0）
 *   B. 分母为选择题数（不含开放题）
 *   C. 叙事高风险题按题去重（一题多个高风险标签只计 1）
 *   D. 旧数据（无 isCorrect）回退到 overall.correct / overall.totalQuestions
 *   E. 渲染环境字段黑名单闸门（render-report.cjs 自带，exit 1 时测试必须失败）
 *
 * 用法：node render-report.e2e.cjs   （退出码 0 = 全部通过）
 */
'use strict';
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const RENDER = path.join(__dirname, 'render-report.cjs');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-e2e-'));
let failures = 0;

function assert(cond, msg) {
  if (cond) {
    console.log('  ✅ ' + msg);
  } else {
    failures++;
    console.log('  ❌ ' + msg);
  }
}

function render(attribution, name) {
  const jsonPath = path.join(tmp, name + '.json');
  const htmlPath = path.join(tmp, name + '.html');
  fs.writeFileSync(jsonPath, JSON.stringify(attribution, null, 2));
  try {
    const out = execFileSync('node', [RENDER, '--json', jsonPath, '--output', htmlPath], { encoding: 'utf-8' });
    return { html: fs.readFileSync(htmlPath, 'utf-8'), out };
  } catch (e) {
    return { error: String(e.stdout || e.message) };
  }
}

function bigCards(html) {
  // 统计区的三个 <div class="big">：总分 / 正确数 / 高风险题数
  const re = /<div class="big">([^<]+)<\/div>/g;
  const m = [];
  let x;
  while ((x = re.exec(html)) !== null) m.push(x[1]);
  return m;
}

console.log('== A/B: 选择题正确数（isCorrect 事实 + 选择题分母）==');
{
  const attribution = {
    sessionId: 'if-20260819-015627',
    title: 'Vue 响应式原理速练（补答）',
    quizMeta: { title: 'Vue 响应式原理速练（补答）', totalQuestions: 5 },
    overall: { score: 60, totalQuestions: 5, answered: 5, correct: 3 },
    dimensions: [{ name: '依赖收集', score: 50 }, { name: '响应式API', score: 70 }],
    questions: [
      { id: 'q01', type: 'choice', category: '依赖收集', stem: 'q01', userAnswer: 'D ❌（认为读操作会把 obj.count 再次包装为新的 Proxy...）', correctAnswer: 'B ✅ 触发 get 拦截，执行 track...', isCorrect: false, cognitionTag: '不会', evidence: '用户原话：...', narrativeRisks: ['术语错误', '过度推断'] },
      { id: 'q02', type: 'choice', category: '响应式API', stem: 'q02', userAnswer: 'C ✅（说明 reactive 面向 Object 包装...）', correctAnswer: 'C ✅ reactive 基于 Proxy 代理对象...', isCorrect: true, cognitionTag: '半懂', evidence: '用户原话：...', narrativeRisks: ['过度推断'] },
      { id: 'q03', type: 'choice', category: '依赖收集', stem: 'q03', userAnswer: 'D ✅（排除 A/C，辨析 B/D...）', correctAnswer: 'D ✅ 触发 set 拦截 → trigger...', isCorrect: true, cognitionTag: '真懂', evidence: '用户原话：...', narrativeRisks: [] },
      { id: 'q04', type: 'choice', category: '响应式API', stem: 'q04', userAnswer: 'A ✅（逐项否决 B/C/D...）', correctAnswer: 'A ✅ computed 惰性求值 + 缓存...', isCorrect: true, cognitionTag: '真懂', evidence: '用户原话：...', narrativeRisks: [] },
      { id: 'q05', type: 'open', category: '依赖收集', stem: 'q05', userAnswer: '从 setup 初始化 reactive/ref 创建 proxy 壳子...', correctAnswer: '要点：reactive/ref 创建响应式对象...', cognitionTag: '半懂', evidence: '用户原话：...', narrativeRisks: ['术语错误', '模糊措辞'] }
    ],
    actions: []
  };
  const r = render(attribution, 'fixtureA');
  if (r.error) { assert(false, '渲染成功 — ' + r.error); }
  else {
    const cards = bigCards(r.html);
    assert(cards.length === 3, '统计区有 3 个数字（总分/正确数/高风险题数），实际 ' + cards.length + ': ' + JSON.stringify(cards));
    assert(cards[0] === '60', '总分 = 60，实际 ' + cards[0]);
    assert(cards[1] === '3/4', '选择题正确 = 3/4（3 对 / 4 道选择题，分母不含开放题），实际 ' + cards[1]);
    assert(!/选择题正确（按总体统计）/.test(r.html), '新模式不显示回退标记');
  }
}

console.log('== C: 叙事高风险题按题去重 ==');
{
  const attribution = {
    sessionId: 'if-20260819-015627',
    title: 'T',
    quizMeta: { title: 'T', totalQuestions: 2 },
    overall: { score: 50, totalQuestions: 2, answered: 2, correct: 1 },
    dimensions: [],
    questions: [
      { id: 'q01', type: 'choice', stem: 'q01', userAnswer: 'A', correctAnswer: 'B', isCorrect: false, cognitionTag: '不会', evidence: 'e', narrativeRisks: ['过度推断', '版本盲区'] },
      { id: 'q02', type: 'choice', stem: 'q02', userAnswer: 'B', correctAnswer: 'B', isCorrect: true, cognitionTag: '真懂', evidence: 'e', narrativeRisks: ['过度推断'] }
    ],
    actions: []
  };
  const r = render(attribution, 'fixtureC');
  if (r.error) { assert(false, '渲染成功 — ' + r.error); }
  else {
    const cards = bigCards(r.html);
    assert(cards[2] === '2', '高风险题数 = 2（q01 的两个高风险标签只计 1，q02 计 1），实际 ' + cards[2]);
    assert(cards[1] === '1/2', '选择题正确 = 1/2，实际 ' + cards[1]);
  }
}

console.log('== D: 旧数据回退（无 isCorrect → overall.correct）==');
{
  const attribution = {
    sessionId: 'if-20260819-000000',
    title: 'T2',
    quizMeta: { title: 'T2', totalQuestions: 5 },
    overall: { score: 60, totalQuestions: 5, answered: 5, correct: 3 },
    dimensions: [],
    questions: [
      { id: 'q01', category: 'c', stem: 'q01', userAnswer: 'D ❌（...）', correctAnswer: 'B ✅ ...', cognitionTag: '不会', evidence: 'e' },
      { id: 'q02', category: 'c', stem: 'q02', userAnswer: 'C ✅（...）', correctAnswer: 'C ✅ ...', cognitionTag: '半懂', evidence: 'e' },
      { id: 'q03', category: 'c', stem: 'q03', userAnswer: 'D ✅（...）', correctAnswer: 'D ✅ ...', cognitionTag: '真懂', evidence: 'e' },
      { id: 'q04', category: 'c', stem: 'q04', userAnswer: 'A ✅（...）', correctAnswer: 'A ✅ ...', cognitionTag: '真懂', evidence: 'e' },
      { id: 'q05', category: 'c', stem: 'q05', userAnswer: '...', correctAnswer: '...', cognitionTag: '半懂', evidence: 'e' }
    ],
    actions: []
  };
  const r = render(attribution, 'fixtureD');
  if (r.error) { assert(false, '渲染成功 — ' + r.error); }
  else {
    const cards = bigCards(r.html);
    assert(cards[1] === '3/5', '回退模式正确数 = 3/5（来自 overall），实际 ' + cards[1]);
    assert(/选择题正确（按总体统计）/.test(r.html), '回退模式显示标记');
  }
}

console.log('== E: 环境字段黑名单闸门（source-level：剔除定义段后源码不含环境痕迹词）==');
{
  // 与 render-report.cjs 的 validateSource() 相同语义：先剔除 ENV_BLOCKLIST 定义段再检查
  const src = fs.readFileSync(RENDER, 'utf-8').replace(/const ENV_BLOCKLIST[\s\S]*?];/, '').toLowerCase();
  const banned = ['workbuddy', 'openclaw', 'vite', 'localhost', '5199', 'interview-forge-public'];
  const hits = banned.filter(w => src.includes(w));
  assert(hits.length === 0, '模板源码（剔除黑名单定义后）不含环境痕迹词' + (hits.length ? '（命中: ' + hits.join(', ') + '）' : ''));
}

console.log('== 结果 ==');
if (failures > 0) {
  console.log(`FAILED: ${failures} 项断言未通过`);
  process.exit(1);
}
console.log('ALL PASS');
