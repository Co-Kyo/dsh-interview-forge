/**
 * L1 结构断言（node:test）—— 渲染管线接缝与模板纯度护栏。
 * 设计依据 design/L4 §2、R2 §2 锚点冻结清单、L3 §5 令牌纯度规则。
 *
 * 红项（S1 目标，当前必红）：
 *   S1-1 cjs 源内不得再含 compute* 定义（已迁 lib/stats.js）
 *   S1-2 cjs 必须 require('./lib/stats.js')
 *   S1-3 cjs 必须导出 renderReport 且带 require.main 守卫（供直调渲染）
 * 绿项（Wave1 已交付的回归护栏）：
 *   W-1 锚点：<div class="big"> 恰好 3 处；八区块 h2 文案精确匹配
 *   W-2 dim-bar--high/mid/low 各 1；@media 断点存在
 *   W-3 CSS 纯度：:root 之外无裸色值；无 emoji 区段
 */
// 与 stats.test.js 同约定：本文件处于根 package.json 的 type:module 辖区，用 ESM 语法。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const RENDER = path.join(__dirname, '..', '..', 'skill', 'scripts', 'render-report.cjs');
const SRC = readFileSync(RENDER, 'utf8');

const SECTIONS = ['综合得分', '维度得分', '叙事风险概览', '维度雷达', '逐题复盘', '交叉检验结论', '面试风险总结', '补强行动计划'];

test('S1-1 cjs 不再定义 compute* 统计函数（已迁 lib/stats.js）', () => {
  for (const fn of ['computeChoiceStats', 'computeDimensionScores', 'computeNarrativeRiskStats', 'computeRiskSummary', 'computeHighRiskQuestionCount']) {
    assert.ok(!SRC.includes('function ' + fn), 'cjs 内不应再有 ' + fn + ' 定义');
  }
});

test('S1-2 cjs 已接 stats 模块', () => {
  assert.ok(SRC.includes("require('./lib/stats.js')"), 'cjs 必须 require ./lib/stats.js');
  assert.ok(!SRC.includes('function band(score)'), 'band 应自 lib 导入，不留本地临时实现');
});

test('S1-3 cjs 导出 renderReport 且带 require.main 守卫', () => {
  assert.ok(/module\.exports\s*=\s*\{[^}]*renderReport/.test(SRC), '应导出 renderReport');
  assert.ok(SRC.includes('require.main === module'), '应带 require.main 守卫');
});

function renderFixtureHtml() {
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'sr-'));
  const json = path.join(tmp, 'f.json');
  const html = path.join(tmp, 'f.html');
  writeFileSync(json, JSON.stringify({
    sessionId: 'if-x-000000', title: '结构冒烟', quizMeta: { title: '结构冒烟', totalQuestions: 3 },
    overall: { score: 60, totalQuestions: 3, answered: 3, correct: 2 },
    dimensions: [{ name: '依赖收集', score: 50 }, { name: '响应式API', score: 70 }, { name: '组件通信', score: 90 }],
    questions: [
      { id: 'q01', type: 'choice', category: '依赖收集', stem: 's1', userAnswer: 'A', correctAnswer: 'B', isCorrect: false, cognitionTag: '不会', evidence: 'e', narrativeRisks: ['术语错误'] },
      { id: 'q02', type: 'choice', category: '响应式API', stem: 's2', userAnswer: 'B', correctAnswer: 'B', isCorrect: true, cognitionTag: '半懂', evidence: 'e', narrativeRisks: [] },
      { id: 'q03', type: 'choice', category: '组件通信', stem: 's3', userAnswer: 'C', correctAnswer: 'C', isCorrect: true, cognitionTag: '真懂', evidence: 'e', narrativeRisks: ['过度推断'] },
    ],
    actions: [],
  }, null, 2));
  execFileSync('node', [RENDER, '--json', json, '--output', html], { encoding: 'utf-8' });
  return readFileSync(html, 'utf8');
}

// W-4 红测：完整原题复盘 —— 题干不截断 + 选项列表带正确/所选双标记
function renderWithOptionsHtml() {
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'sr-opt-'));
  const json = path.join(tmp, 'f.json');
  const html = path.join(tmp, 'f.html');
  writeFileSync(json, JSON.stringify({
    sessionId: 'if-o-000000', title: 'T', quizMeta: { title: 'T', totalQuestions: 1 },
    overall: { score: 100, totalQuestions: 1, answered: 1, correct: 1 },
    dimensions: [{ name: 'd', score: 100 }],
    questions: [{
      id: 'q01', type: 'choice', category: 'c',
      stem: '这是一道故意写得很长很长的题干，用于验证报告复盘区不再截断到六十个字符，必须完整披露原始题面供用户回到真实场景。',
      options: [{ key: 'A', text: '选项甲' }, { key: 'B', text: '选项乙' }, { key: 'C', text: '选项丙' }],
      correctKey: 'B', selectedKey: 'A',
      userAnswer: 'A ❌（选甲）', correctAnswer: 'B ✅（选乙）', isCorrect: false, cognitionTag: '不会', evidence: '用户原话：……', narrativeRisks: [],
    }],
    actions: [],
  }, null, 2));
  execFileSync('node', [RENDER, '--json', json, '--output', html], { encoding: 'utf-8' });
  return readFileSync(html, 'utf8');
}
const OPT = renderWithOptionsHtml();

test('W-4 完整原题披露：题干不截断 + 选项带正确/所选标记', () => {
  assert.ok(OPT.includes('不再截断到六十个字符'), '题干应完整披露（不截断到 60 字）');
  const opts = [...OPT.matchAll(/class="opt([^"]*)"[^>]*><span class="opt-k">([A-Z])<\/span>[\s\S]*?<span class="opt-t">([^<]*)<\/span>/g)];
  assert.strictEqual(opts.length, 3, '三个选项都应渲染');
  const sel = opts.find(m => m[2] === 'A');
  const cor = opts.find(m => m[2] === 'B');
  assert.ok(sel && sel[1].includes('sel'), '所选 A 应带 sel 标记');
  assert.ok(cor && cor[1].includes('cor'), '正确 B 应带 cor 标记');
  assert.ok(!opts.find(m => m[2] === 'C')[1].includes('sel') && !opts.find(m => m[2] === 'C')[1].includes('cor'), 'C 无标记');
});

const OUT = renderFixtureHtml();

test('W-1 锚点：big 卡恰好 3 处 + 八区块 h2 精确匹配', () => {
  assert.strictEqual((OUT.match(/<div class="big">/g) || []).length, 3, 'big 卡应恰好 3 处');
  const h2s = [...OUT.matchAll(new RegExp('<h2[^>]*>([\\s\\S]*?)<\\/h2>', 'g'))].map(m => m[1].replace(/<[^>]+>/g, '').trim());
  for (const s of SECTIONS) assert.ok(h2s.includes(s), '缺 h2: ' + s);
  assert.ok(OUT.includes('<!-- 逐题复盘 -->') && OUT.includes('<!-- 面试风险总结 -->'), '区块注释锚点应在');
});

test('W-2 band 类与响应式断点', () => {
  for (const b of ['high', 'mid', 'low']) assert.strictEqual((OUT.match(new RegExp('dim-bar--' + b, 'g')) || []).length, 1, 'dim-bar--' + b + ' 应恰 1 次');
  assert.ok(OUT.includes('@media') && OUT.includes('820px'), '应有 820px 断点');
});

test('W-3 CSS 纯度：:root 外无裸色值；无 emoji 区段', () => {
  const styleSeg = OUT.slice(OUT.indexOf('<style>'), OUT.indexOf('</style>'));
  const rootSeg = styleSeg.slice(0, styleSeg.indexOf('}') + 2);
  const rest = styleSeg.slice(styleSeg.indexOf('}') + 2);
  assert.ok(!/(#[0-9a-fA-F]{3,8}[^0-9a-fA-F]|rgb\s*\()/.test(rest), ':root 之外不应有裸色值');
  const hasEmoji = [...OUT].some(ch => { const c = ch.codePointAt(0); return (c >= 0x1F300 && c <= 0x1FAFF) || (c >= 0x2600 && c <= 0x27BF); });
  assert.ok(!hasEmoji, '不应有 emoji 字形依赖');
});
