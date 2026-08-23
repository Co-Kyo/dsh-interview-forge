/**
 * InterviewForge 报告旅程 e2e（T7 组）—— L6 实施计划第 0 步：红测锁用户旅程。
 * 直击 live GUI（127.0.0.1:3080），自种三件套（quiz+report）使场次呈 reported 态。
 *
 * 红测契约（对齐 design/L6）：
 *   T7a 标题唯一：模态内会话标题合计出现 1 次（现状：模态头+正文 h1 = 2 → FAIL）
 *   T7b 区块层级：8 个区块均为 h2（现状：维度得分/叙事风险概览非 h2 → FAIL）
 *   T7c 窄视口守卫：750×900 下 iframe 内容无横向溢出（现状待测；绿则记为既有护栏）
 *   T7d band 语义色：dim-bar--high/mid/low 类名与分值匹配（现状无 band 类 → FAIL）
 *
 * 种子报告 HTML 由当前 render-report.cjs 对 fixture 渲染生成——忠实反映模板现状。
 */
import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync, unlinkSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ARCHIVE = '/home/tanka/答题插件开发/interview-forge-archive';
const RENDER = '/home/tanka/答题插件开发/forge-plugin/skill/scripts/render-report.cjs';
const NONCE = Date.now().toString(36);
const TITLE = 'E2E-T7-报告旅程-' + NONCE;
// 宿主按 if-YYYYMMDD-HHMMSS 形状从 SID 推导归档目录，必须严格遵守
const SID = (() => { const d = new Date(); return 'if-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + String(Date.now() % 1000000).padStart(6, '0'); })();
let seedDir = '';
const cleanupPaths = [];

const FIXTURE = {
  sessionId: SID,
  title: TITLE,
  quizMeta: { title: TITLE, totalQuestions: 3 },
  overall: { score: 60, totalQuestions: 3, answered: 3, correct: 2 },
  dimensions: [
    { name: '依赖收集', score: 50 },   // low
    { name: '响应式API', score: 70 }, // mid
    { name: '组件通信', score: 90 },  // high
  ],
  questions: [
    { id: 'q01', type: 'choice', category: '依赖收集', stem: 'q01', userAnswer: 'D ❌（误答）', correctAnswer: 'B ✅（正确要点）', isCorrect: false, cognitionTag: '不会', evidence: 'E2E 证据一', narrativeRisks: ['术语错误'] },
    { id: 'q02', type: 'choice', category: '响应式API', stem: 'q02', userAnswer: 'C ✅（正确）', correctAnswer: 'C ✅（标准答案）', isCorrect: true, cognitionTag: '真懂', evidence: 'E2E 证据二', narrativeRisks: [] },
    { id: 'q03', type: 'choice', category: '组件通信', stem: 'q03', userAnswer: 'A ✅（基本正确）', correctAnswer: 'A ✅（标准答案）', isCorrect: true, cognitionTag: '半懂', evidence: 'E2E 证据三', narrativeRisks: ['过度推断'] },
  ],
  actions: [],
};

const SECTIONS = ['综合得分', '维度得分', '叙事风险概览', '维度雷达', '逐题复盘', '交叉检验结论', '面试风险总结', '补强行动计划'];

function pad(n) { return String(n).padStart(2, '0'); }

/** 渲染种子报告并种入 reported 场次，返回归档目录路径。 */
function seedReportedSession() {
  const d = new Date();
  const dateDir = ARCHIVE + '/sessions/' + d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  mkdirSync(dateDir, { recursive: true });
  seedDir = dateDir;
  const quizPath = dateDir + '/quiz-' + SID + '.json';
  const reportPath = dateDir + '/report-' + SID + '.html';
  cleanupPaths.push(quizPath, reportPath);
  writeFileSync(quizPath, JSON.stringify({
    meta: { title: TITLE, tags: ['e2e'] }, totalQuestions: 3, questions: FIXTURE.questions.map((q, i) => ({
      id: q.id, type: 'choice', stem: q.stem, options: [{ key: 'A', text: 'A' }, { key: 'B', text: 'B' }, { key: 'C', text: 'C' }, { key: 'D', text: 'D' }], answer: 'B',
    })),
  }, null, 2));
  // 用当前真实模板渲染种子报告——保证红测反映模板现状而非夹具臆造
  const tmpJson = join(tmpdir(), 't7-fixture-' + NONCE + '.json');
  writeFileSync(tmpJson, JSON.stringify(FIXTURE, null, 2));
  cleanupPaths.push(tmpJson);
  execFileSync('node', [RENDER, '--json', tmpJson, '--output', reportPath], { encoding: 'utf-8' });
  return dateDir;
}

test.afterAll(() => {
  for (const p of cleanupPaths) { try { unlinkSync(p); } catch { /* already gone */ } }
  try { rmSync(join(tmpdir(), 't7-fixture-' + NONCE + '.json'), { force: true }); } catch { /* noop */ }
});

async function openReport(page) {
  await page.goto('/');
  await page.waitForSelector('.forge-fab', { timeout: 20000 });
  await page.click('.forge-fab');
  const item = page.locator('.forge-item', { hasText: TITLE });
  await item.waitFor({ timeout: 20000 });
  await item.click();
  await page.waitForSelector('.forge-modal iframe', { timeout: 10000 });
}

/** 取报告 iframe 的 srcDoc 全文（沙箱 unique-origin，字符串断言最稳）。 */
async function getSrcDoc(page) {
  const el = page.locator('.forge-modal iframe');
  await expect(el).toBeVisible();
  return (await el.getAttribute('srcdoc')) || '';
}

test.describe('InterviewForge 报告旅程 T7', () => {

  test.beforeAll(() => { seedReportedSession(); });

  test('T7a 模态内标题唯一', async ({ page }) => {
    await openReport(page);
    const headText = await page.locator('.forge-card-head').innerText();
    let occurrences = headText.split(TITLE).length - 1; // 模态头中的出现次数
    const srcDoc = await getSrcDoc(page);
    occurrences += srcDoc.split(TITLE).length - 1;      // 正文（iframe 文档）中的出现次数
    expect(occurrences, '会话标题在报告模态内应只出现 1 次').toBe(1);
  });

  test('T7b 八大区块均为 h2 层级', async ({ page }) => {
    await openReport(page);
    const srcDoc = await getSrcDoc(page);
    const h2s = [...srcDoc.matchAll(new RegExp('<h2[^>]*>([\\s\\S]*?)</h2>', 'g'))].map(m => m[1].replace(/<[^>]+>/g, '').trim());
    for (const s of SECTIONS) {
      expect(h2s, '区块「' + s + '」应为 h2 层级').toContain(s);
    }
  });

  test('T7c 窄视口 750px 无横向溢出', async ({ page }) => {
    await page.setViewportSize({ width: 750, height: 900 });
    await openReport(page);
    // 等待 srcdoc frame 就绪后在其执行上下文里量溢出
    let metrics = null;
    for (let i = 0; i < 20 && !metrics; i++) {
      const frame = page.frames().find(f => f.url() === 'about:srcdoc');
      if (frame) {
        try { metrics = await frame.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, ready: document.readyState })); } catch { /* not ready */ }
      }
      if (!metrics || metrics.ready !== 'complete') { metrics = null; await page.waitForTimeout(500); }
    }
    expect(metrics, '应能进入报告 iframe 执行上下文').toBeTruthy();
    expect(metrics.sw, '750px 视口下报告内容不应横向溢出').toBeLessThanOrEqual(metrics.cw + 1);
  });

  test('T7d 维度条颜色按分值语义分级', async ({ page }) => {
    await openReport(page);
    const srcDoc = await getSrcDoc(page);
    // fixture 三维度：50→low、70→mid、90→high，各出现且仅一次
    for (const band of ['high', 'mid', 'low']) {
      const n = (srcDoc.match(new RegExp('dim-bar--' + band, 'g')) || []).length;
      expect(n, 'band=' + band + ' 的维度条类名应恰好出现 1 次').toBe(1);
    }
  });
});
