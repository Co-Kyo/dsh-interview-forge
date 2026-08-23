/**
 * InterviewForge 答题流程 e2e —— 直击 live GUI（127.0.0.1:3080）。
 * 覆盖三类真实缺陷（对齐 v29 参考语义）：
 *   T1 计时器：答题卡打开后出现「总 MM:SS | 本题 MM:SS」并持续递增；
 *   T2 切题不串台：Q1/Q2 交替作答，选项与理由互不污染（UI + 宿主 answers 双重校验）；
 *   T3 收起草稿：输入后立即收起再重开，草稿保留且计时恢复递增。
 * 每条用例向档案目录种入独立练习场次，结束后清理（宿主 list 自愈机制自动出列）。
 */
import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync, unlinkSync, rmSync } from 'node:fs';

const ARCHIVE = '/home/tanka/答题插件开发/interview-forge-archive';
// 每轮唯一标记：断言只认本轮写入的答案，宿主残留（重启前不可出列）不会造成假阳性
const NONCE = Date.now().toString(36);
const TAGS = ['t1-timer', 't2-nav', 't3-draft'];
const seededSids: string[] = [];

function pad(n: number): string { return String(n).padStart(2, '0'); }

const MARK1 = `E2E标记一-${NONCE}-Q1独有`;
const MARK2 = `E2E标记二-${NONCE}-Q2独有`;
const DRAFT_MARK = `收起前草稿-${NONCE}-末尾易丢字段`;

// 当天固定 sid（时分秒取 00:00:0x）：同一天内重复跑套件复用同一场次，
// 宿主进程内存中的残留条目因此不会堆积；跨天自然更换新 sid。
function sidForTag(tag: string): string {
  const d = new Date();
  const idx = TAGS.indexOf(tag);
  return `if-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-00000${idx + 1}`;
}

/** 种入一场 E2E 练习（3 道选择题），返回 sessionId。 */
function seedQuiz(tag: string): string {
  const d = new Date();
  const dateDir = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const sid = sidForTag(tag);
  const dir = `${ARCHIVE}/sessions/${dateDir}`;
  seededSids.push(sid);
  mkdirSync(dir, { recursive: true });
  const quiz = {
    meta: { title: `[E2E:${tag}] 答题流程冒烟`, tags: ['e2e'] },
    totalQuestions: 3,
    questions: [
      { id: 'q1', type: 'choice', stem: 'E2E-Q1：1 + 1 = ?', options: [{ key: 'A', text: '1' }, { key: 'B', text: '2' }, { key: 'C', text: '3' }, { key: 'D', text: '4' }], answer: 'B' },
      { id: 'q2', type: 'choice', stem: 'E2E-Q2：晴朗白天天空主色？', options: [{ key: 'A', text: '红' }, { key: 'B', text: '绿' }, { key: 'C', text: '蓝' }, { key: 'D', text: '黑' }], answer: 'C' },
      { id: 'q3', type: 'choice', stem: 'E2E-Q3：2 × 3 = ?', options: [{ key: 'A', text: '5' }, { key: 'B', text: '6' }, { key: 'C', text: '7' }, { key: 'D', text: '8' }], answer: 'B' },
    ],
  };
  writeFileSync(`${dir}/quiz-${sid}.json`, JSON.stringify(quiz, null, 2));
  return sid;
}

/** 种入 markdown 富文本练习（对齐 v29 renderMd 覆盖面：围栏代码/行内标记/表格/列表）。 */
function seedQuizMd(tag: string): string {
  const d = new Date();
  const dateDir = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const idx = TAGS.indexOf(tag);
  const sid = `if-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-00001${idx >= 0 ? idx + 1 : 1}`;
  const dir = `${ARCHIVE}/sessions/${dateDir}`;
  seededSids.push(sid);
  mkdirSync(dir, { recursive: true });
  const quiz = {
    meta: { title: `[E2E:${tag}] Markdown 渲染冒烟`, tags: ['e2e'] },
    totalQuestions: 3,
    questions: [
      {
        id: 'q1', type: 'choice',
        stem: '**重点**：阅读以下代码，`reactive` 返回的是什么？\n\n```js\nconst obj = reactive({ n: 0 })\nconsole.log(obj.n)\n```',
        options: [
          { key: 'A', text: '原始对象的 `ref()` 包裹' },
          { key: 'B', text: '基于 Proxy 的响应式代理（深层）' },
          { key: 'C', text: '普通对象拷贝，无响应式' },
          { key: 'D', text: '抛出 *TypeError*' },
        ],
        answer: 'B',
      },
      {
        id: 'q2', type: 'choice',
        stem: '| 特性 | ref | reactive |\n| --- | :--: | --- |\n| 基本类型 | ✅ | ❌ |\n| 对象 | ⭕️ | ✅ |\n\n- 列表项一\n- 列表项二',
        options: [{ key: 'A', text: 'A' }, { key: 'B', text: 'B' }, { key: 'C', text: 'C' }, { key: 'D', text: 'D' }],
        answer: 'A',
      },
      { id: 'q3', type: 'choice', stem: 'E2E-Q3 占位', options: [{ key: 'A', text: 'A' }, { key: 'B', text: 'B' }], answer: 'A' },
    ],
  };
  writeFileSync(`${dir}/quiz-${sid}.json`, JSON.stringify(quiz, null, 2));
  return sid;
}

test.afterAll(() => {
  for (const sid of new Set(seededSids)) {
    const m = /^if-(\d{4})(\d{2})(\d{2})-/.exec(sid);
    if (!m) continue;
    try { unlinkSync(`${ARCHIVE}/sessions/${m[1]}-${m[2]}-${m[3]}/quiz-${sid}.json`); } catch { /* already gone */ }
  }
});

/** 从页面上下文直调宿主 forge remote。
 *  信封实测形状：payload.args 是 wire map；网关方法为单对象参数，
 *  实际参数要再包一层 args（payload:{args:{args:{...}}}）。 */
async function forgeRpc<T>(page: Page, method: string, args: Record<string, unknown>): Promise<T> {
  return page.evaluate(async ({ method, args }) => {
    const r = await fetch('/api/forge/' + method, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'client-request', rpcId: 'e2e-' + method, method: 'forge/' + method, payload: { args: { args } } }),
    });
    const j = await r.json();
    if (!j || !j.result || !j.result.ok) throw new Error('rpc fail: ' + JSON.stringify(j).slice(0, 200));
    return j.result.value as unknown;
  }, { method, args }) as Promise<T>;
}

/** 打开 ⚡ 队列并进入指定场次的答题卡（先把进度归位到第 1 题，兼容场次复用）。 */
async function openQuiz(page: Page, sid: string): Promise<void> {
  await page.goto('/');
  await forgeRpc(page, 'nav', { sessionId: sid, index: 0 });
  await page.waitForSelector('.forge-fab', { timeout: 20_000 });
  await page.click('.forge-fab');
  const item = page.locator('.forge-item', { hasText: sid });
  await item.waitFor({ timeout: 15_000 });
  await item.click();
  await page.waitForSelector('.forge-modal .forge-card', { timeout: 10_000 });
}

/** 收起答题卡后队列面板可能仍开着（模态只是盖在上面），确保面板可见再点条目。 */
async function reopenFromQueue(page: Page, sid: string): Promise<void> {
  const panel = page.locator('.forge-panel');
  if ((await panel.count()) === 0 || !(await panel.isVisible())) {
    await page.click('.forge-fab');
  }
  const item = page.locator('.forge-item', { hasText: sid });
  await item.waitFor({ timeout: 15_000 });
  await item.click();
  await page.waitForSelector('.forge-modal .forge-card', { timeout: 10_000 });
}

function timerLoc(page: Page) {
  return page.locator('.forge-card-head span', { hasText: /总 \d{2}:\d{2} \| 本题 \d{2}:\d{2}/ });
}
function secOf(text: string | null): number {
  const m = /总 (\d{2,}):(\d{2}) \| 本题 (\d{2,}):(\d{2})/.exec(text || '');
  return m ? Number(m[1]) * 60 + Number(m[2]) : -1;
}

test.describe('InterviewForge 答题流程', () => {

  /** 预检：live 宿主必须能从磁盘发现种子场次。失败通常意味着宿主档案根发现
   *  （discoverRoots）失效 —— 部署了修复但尚未重启 dsh 时会走到这里。 */
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    const sid = seedQuiz('preflight');
    await page.goto('/');
    await page.waitForSelector('.forge-fab', { timeout: 20_000 });
    await page.click('.forge-fab');
    const item = page.locator('.forge-item', { hasText: sid });
    try {
      await item.waitFor({ timeout: 10_000 });
    } catch {
      throw new Error(
        '预检失败：live 宿主未从磁盘发现种子场次 ' + sid +
        '。最常见原因：宿主 forge-gateway 的 discoverRoots 修复已部署但 dsh 尚未重启（旧进程仍在用旧锚点几何）。请重启 dsh 后重跑。',
      );
    } finally {
      await page.close();
    }
  });

  test('T1 计时器：打开即出现并持续递增', async ({ page }) => {
    const sid = seedQuiz('t1-timer');
    await openQuiz(page, sid);
    const timer = timerLoc(page);
    await expect(timer).toBeVisible({ timeout: 10_000 });
    const t1 = secOf(await timer.textContent());
    expect(t1).toBeGreaterThanOrEqual(0);
    await page.waitForTimeout(2300);
    const t2 = secOf(await timer.textContent());
    expect(t2, `计时器应在 2.3s 内递增（${t1}s -> ${t2}s）`).toBeGreaterThan(t1);
  });

  test('T2 切题不串台：来回切换答案各自保留（UI + 宿主双校验）', async ({ page }) => {
    const sid = seedQuiz('t2-nav');
    await openQuiz(page, sid);
    const txt = page.locator('.forge-txt');

    // Q1：选 A + 理由一
    await expect(page.locator('.forge-card-head', { hasText: '第 1/3 题' })).toBeVisible({ timeout: 10_000 });
    await page.locator('.forge-opt').first().click();
    await txt.fill(MARK1);
    await page.locator('button', { hasText: '提交并下一题' }).click();

    // Q2：选 B + 理由二
    await expect(page.locator('.forge-card-head', { hasText: '第 2/3 题' })).toBeVisible({ timeout: 10_000 });
    await page.locator('.forge-opt').nth(1).click();
    await txt.fill(MARK2);

    // 回 Q1：理由与选项必须是 Q1 的
    await page.locator('button', { hasText: '← 上一题' }).click();
    await expect(page.locator('.forge-card-head', { hasText: '第 1/3 题' })).toBeVisible({ timeout: 10_000 });
    await expect(txt).toHaveValue(new RegExp(MARK1), { timeout: 5_000 });
    await expect(page.locator('.forge-opt.sel')).toHaveCount(1);
    await expect(page.locator('.forge-opt.sel .k')).toHaveText('A');

    // 再回 Q2：必须是 Q2 的
    await page.locator('button', { hasText: '提交并下一题' }).click();
    await expect(page.locator('.forge-card-head', { hasText: '第 2/3 题' })).toBeVisible({ timeout: 10_000 });
    await expect(txt).toHaveValue(new RegExp(MARK2), { timeout: 5_000 });
    await expect(page.locator('.forge-opt.sel .k')).toHaveText('B');

    // 宿主侧 answers 双校验：两题记录互不污染
    const snap = await forgeRpc<{ answers: Record<string, { selected?: string; note?: string }> }>(page, 'snapshot', { sessionId: sid });
    expect(snap.answers.q1?.note).toContain(MARK1);
    expect(snap.answers.q1?.selected).toBe('A');
    expect(snap.answers.q2?.note).toContain(MARK2);
    expect(snap.answers.q2?.selected).toBe('B');
  });

  test('T3 收起草稿：立即收起不丢字，重开计时恢复递增', async ({ page }) => {
    const sid = seedQuiz('t3-draft');
    await openQuiz(page, sid);
    const txt = page.locator('.forge-txt');
    await txt.fill(DRAFT_MARK);

    // 不等防抖窗口，立即收起（对齐 v29 minimize：pause + 收起）
    await page.locator('.forge-modal .forge-card-head button', { hasText: '收起' }).click();
    await page.waitForSelector('.forge-modal', { state: 'detached', timeout: 5_000 });
    await page.waitForTimeout(800); // 给 flush / 轮询留时间

    // 重开同一场次（收起后队列面板可能仍处于打开状态）
    await reopenFromQueue(page, sid);

    await expect(txt).toHaveValue(new RegExp(DRAFT_MARK), { timeout: 8_000 });

    // 计时应恢复递增（v29 语义：openQuiz -> forge.resume）
    const timer = timerLoc(page);
    await expect(timer).toBeVisible({ timeout: 10_000 });
    const r1 = secOf(await timer.textContent());
    await page.waitForTimeout(2300);
    const r2 = secOf(await timer.textContent());
    expect(r2, `重开后计时应继续递增（${r1}s -> ${r2}s）`).toBeGreaterThan(r1);

    const snap = await forgeRpc<{ answers: Record<string, { note?: string }> }>(page, 'snapshot', { sessionId: sid });
    expect(snap.answers.q1?.note).toContain(DRAFT_MARK);
  });
});

test.describe('InterviewForge Markdown 渲染', () => {
  // 对齐 v29 renderMd 语义：围栏代码块 / 行内代码·粗体·斜体 / 表格（含对齐）/ 列表
  test('T4 题干与选项的 markdown 渲染为富文本元素', async ({ page }) => {
    const sid = seedQuizMd('t4-md');
    await openQuiz(page, sid);
    const stem = page.locator('.forge-stem');

    // 围栏代码块：pre>code 且无裸反引号
    await expect(page.locator('.forge-stem pre.forge-md-pre code')).toContainText('const obj = reactive', { timeout: 10_000 });
    expect(await stem.innerText()).not.toContain('```');
    // 行内代码与粗体
    await expect(page.locator('.forge-stem code.forge-md-code').first()).toHaveText('reactive');
    await expect(page.locator('.forge-stem strong')).toHaveText('重点');
    expect(await stem.innerText()).not.toContain('**');

    // 选项中的行内标记
    await expect(page.locator('.forge-opt code.forge-md-code')).toHaveText(['ref()']);

    // 提交进入 Q2：表格 + 列表
    await page.locator('.forge-opt').first().click();
    await page.locator('.forge-txt').fill('md 渲染冒烟作答');
    await page.locator('button', { hasText: '提交并下一题' }).click();
    await expect(page.locator('.forge-card-head', { hasText: '第 2/3 题' })).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.forge-stem table.forge-md-table thead th')).toHaveText(['特性', 'ref', 'reactive']);
    await expect(page.locator('.forge-stem table.forge-md-table tbody tr')).toHaveCount(2);
    await expect(page.locator('.forge-stem ul.forge-md-list li')).toHaveText(['列表项一', '列表项二']);
    expect(await stem.innerText()).not.toContain('| ---');
  });
});

test.describe('InterviewForge Markdown 视觉样式', () => {
  // 用户反馈：代码背景框与选项框区分度不够。根因：代码块底色用了与题干卡
  // 相同的 bg-module-platform 令牌 —— 代码块在卡片内隐形。
  test('T5 代码块与题干卡、选项框有明确视觉区分', async ({ page }) => {
    const sid = seedQuizMd('t5-mdstyle');
    await openQuiz(page, sid);
    await page.waitForSelector('.forge-md-pre', { timeout: 10_000 }); // 等题目渲染完成再取样式
    const s = await page.evaluate(() => {
      const cs = (sel) => { const el = document.querySelector(sel); return el ? getComputedStyle(el) : null }
      const lum = (rgb) => { const m = String(rgb).match(/\d+/g); return m ? 0.2126 * Number(m[0]) + 0.7152 * Number(m[1]) + 0.0722 * Number(m[2]) : -1 }
      const pre = cs('.forge-md-pre'), opt = cs('.forge-opt'), card = cs('.forge-q');
      return {
        preLeftBar: pre ? parseFloat(pre.borderLeftWidth) : 0,
        deltaPreOpt: Math.abs(lum(pre?.backgroundColor) - lum(opt?.backgroundColor)),
        deltaPreCard: Math.abs(lum(pre?.backgroundColor) - lum(card?.backgroundColor)),
      };
    });
    expect(s.preLeftBar, '代码块应有 ≥3px 品牌色左侧强调条（区别于选项的整框描边）').toBeGreaterThanOrEqual(3);
    expect(s.deltaPreOpt, '代码块与选项框底色亮度差应 >24').toBeGreaterThan(24);
    expect(s.deltaPreCard, '代码块不应与题干卡同色（亮度差应 >18）').toBeGreaterThan(18);
  });
});

test.describe('InterviewForge 完成跳转', () => {
  // 对齐 v29 closeQuiz：完成后可一键跳回出题会话并发送「答完了」
  test('T6 完成页提供跳转按钮，点击后切换会话并发送答完了', async ({ page }) => {
    // 自重置：T6 会把练习做完（submitted 且宿主记忆不可逆），先删档等自愈出列再重种
    const t6Sid = 'if-20260823-084428'; // forge_start 创建的真实场次（所有权链路即真实链路）
    // 归档日期必须由 SID 推导（宿主按 sid 内日期映射目录）——不可用“今天”，跨午夜会错位
    const dateDir = `${t6Sid.slice(3, 7)}-${t6Sid.slice(7, 9)}-${t6Sid.slice(9, 11)}`;
    const quizPath = `${ARCHIVE}/sessions/${dateDir}/quiz-${t6Sid}.json`;
    const resultPath = `${ARCHIVE}/sessions/${dateDir}/result-${t6Sid}.json`;
    // report 文件必须一并清除：hasReport 优先判定，残留会把状态顶成 reported、点开变报告模态
    const reportPath = `${ARCHIVE}/sessions/${dateDir}/report-${t6Sid}.html`;
    rmSync(quizPath, { force: true });
    rmSync(resultPath, { force: true });
    rmSync(reportPath, { force: true });
    await page.goto('/');
    await page.waitForSelector('.forge-fab', { timeout: 20_000 });
    await page.click('.forge-fab');
    // 等旧条目从宿主内存出列（list 轮询 3s 一轮）
    await page.waitForTimeout(7000);
    writeFileSync(quizPath, JSON.stringify({
      meta: { title: '[E2E:t6] 跳转会话冒烟', tags: ['e2e'] }, totalQuestions: 2,
      questions: [
        { id: 'q1', type: 'choice', stem: 'E2E-Q1：1+1=?', options: [{ key: 'A', text: '1' }, { key: 'B', text: '2' }, { key: 'C', text: '3' }], answer: 'B' },
        { id: 'q2', type: 'choice', stem: 'E2E-Q2：天空颜色？', options: [{ key: 'A', text: '蓝' }, { key: 'B', text: '红' }], answer: 'A' },
      ],
    }, null, 2));
    seededSids.push(t6Sid);
    await page.goto('/');
    await page.waitForSelector('.forge-fab', { timeout: 20_000 });
    await page.waitForSelector('.forge-fab', { timeout: 20_000 });
    await page.click('.forge-fab');
    const item = page.locator('.forge-item', { hasText: '[E2E:t6] 跳转会话冒烟' });
    await item.waitFor({ timeout: 20_000 });
    const sid = (/if-\d{8}-\d{6}/.exec(await item.locator('.s').innerText()) || [''])[0];
    expect(sid, '队列条目应带 sessionId 副标题').toMatch(/^if-/);
    await item.click();
    await page.waitForSelector('.forge-modal .forge-card', { timeout: 10_000 });

    const txt = page.locator('.forge-txt');
    // Q1
    await expect(page.locator('.forge-card-head', { hasText: '第 1/2 题' })).toBeVisible({ timeout: 10_000 });
    await page.locator('.forge-opt').first().click();
    await txt.fill('t6 冒烟作答一');
    await page.locator('button', { hasText: '提交并下一题' }).click();
    // Q2 → 完成练习
    await expect(page.locator('.forge-card-head', { hasText: '第 2/2 题' })).toBeVisible({ timeout: 10_000 });
    await page.locator('.forge-opt').nth(1).click();
    await txt.fill('t6 冒烟作答二');
    await page.locator('button', { hasText: '完成练习' }).click();

    // 完成页：出现跳转按钮
    const jumpBtn = page.locator('.forge-modal button', { hasText: '跳转出题会话' });
    await expect(jumpBtn).toBeVisible({ timeout: 10_000 });
    await jumpBtn.click();

    // 模态应关闭，且目标会话中出现已发送的「答完了」用户消息
    await page.waitForSelector('.forge-modal', { state: 'detached', timeout: 15_000 });
    await expect(page.getByText('答完了').first()).toBeVisible({ timeout: 20_000 });
    void sid;
  });
});
