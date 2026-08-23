#!/usr/bin/env node

/**
 * InterviewForge 归因报告渲染器
 *
 * 用法：node render-report.cjs --json <attribution.json> --output <report.html>
 *
 * 读取归因 JSON，渲染为完整的 HTML 雷达报告。
 * 零外部依赖，纯 Node.js 内置模块。
 */

const fs = require('fs');
const path = require('path');
const { getCognitionTag, getCognitionLabel, riskBadgeClass, HIGH_RISK_TAGS,
  computeDimensionScores, computeNarrativeRiskStats, computeRiskSummary,
  computeChoiceStats, computeHighRiskQuestionCount,
  band,
} = require('./lib/stats.js');

// ---- CLI 参数解析 ----
function parseArgs() {
  const args = process.argv.slice(2);
  let jsonPath = null;
  let outputPath = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--json' && args[i + 1]) jsonPath = args[++i];
    if (args[i] === '--output' && args[i + 1]) outputPath = args[++i];
  }
  if (!jsonPath) {
    console.error('Usage: node render-report.cjs --json <attribution.json> --output <report.html>');
    process.exit(1);
  }
  if (!outputPath) {
    // 默认输出到同目录，文件名替换 attribution→report
    outputPath = jsonPath.replace(/attribution-/, 'report-').replace(/\.json$/, '.html');
  }
  return { jsonPath, outputPath };
}

// ---- 文案配置（业务场景/环境相关文案集中于此） ----
const COPY = {
  sceneNote: '以「技术面试」为考察场景：按面试作答标准检验掌握度与表述能力',
  riskSummaryTitle: '面试风险总结',
  safePhraseLabel: '面试安全话术：',
  preciseCorrectionLabel: '面试精确表述：',
  ctaText: '报告中的 P0 级薄弱点已识别。回到当前对话，回复<strong>「继续推进」</strong>，即可启动针对性深度研究——从源码和权威资料出发，帮你从「知道结论」推进到「理解机制」。'
};

// ---- 工具函数 ----
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cardClass(cognitionTag) {
  if (['真懂', 'genuine'].includes(cognitionTag)) return 'correct';
  if (['不会', 'blind'].includes(cognitionTag)) return 'wrong';
  return 'partial';
}

function tagClass(cognitionTag) {
  if (['真懂', 'genuine'].includes(cognitionTag)) return 'tag-green';
  if (['不会', 'blind'].includes(cognitionTag)) return 'tag-red';
  return 'tag-orange';
}

function actionClass(priority) {
  if (priority === 'P0') return 'action-p0';
  if (priority === 'P1') return 'action-p1';
  return 'action-p2';
}

function priorityLabel(priority) {
  if (priority === 'P0') return 'P0 紧急';
  if (priority === 'P1') return 'P1 重要';
  return 'P2 可选';
}

function renderQuestionCards(data) {
  const questions = data.questions || [];
  return questions.map(q => {
    const cTag = getCognitionTag(q);
    const cls = cardClass(cTag);
    const tcls = tagClass(cTag);
    const auditBadge = q.questionAudit && q.questionAudit.flag !== 'ok'
      ? `<span class="audit-badge">${escapeHtml(q.questionAudit.flag)}</span>`
      : '';

    // 叙事风险区
    let narrativeHtml = '';
    if (q.narrativeRisks && q.narrativeRisks.length > 0) {
      const riskBadges = q.narrativeRisks.map(r =>
        `<span class="risk-badge ${riskBadgeClass(r)}">${escapeHtml(r)}</span>`
      ).join(' ');

      const isHighRisk = q.narrativeRisks.some(r => ['过度推断', '不懂装懂', '版本盲区'].includes(r));
      const riskCls = isHighRisk ? 'narrative-section' : 'narrative-section warn';

      // 从 evidence 中提取用户原话
      const evidenceSnippet = q.evidence
        ? q.evidence.replace(/^用户原话：/, '').substring(0, 100)
        : '';

      narrativeHtml = `
  <div class="${riskCls}">
    <strong>叙事风险：</strong>${riskBadges}
    <p class="narrative-evidence">${escapeHtml(evidenceSnippet)}</p>
  </div>`;
    }

    // 面试安全话术
    let safePhraseHtml = '';
    if (q.interviewSafePhrase) {
      safePhraseHtml = `
  <div class="safe-phrase">
    ${COPY.safePhraseLabel}${escapeHtml(q.interviewSafePhrase)}
  </div>`;
    }

    // 精确表述纠正
    let correctionHtml = '';
    if (q.preciseCorrection) {
      correctionHtml = `
  <div class="safe-phrase">
    ${COPY.preciseCorrectionLabel}${escapeHtml(q.preciseCorrection)}
  </div>`;
    }

    // 用户原话（从 evidence 提取）
    const userQuote = q.evidence || '';
    // 题干摘要（从 stem 截取前60字）
    const stemBrief = q.stem ? (q.stem.length > 60 ? q.stem.substring(0, 60) + '…' : q.stem) : '';
    // 用户答案摘要
    const userAnsBrief = q.userAnswer || '';
    // 正确答案
    const correctAns = q.correctAnswer || '';

    // 逐题卡片 QA 区
    let qaContentHtml = '';
    if (stemBrief) {
      qaContentHtml = `
  <div class="qa-block">
    <div class="q">${escapeHtml(stemBrief)}</div>
    <div class="a">${escapeHtml(userAnsBrief)}</div>${correctAns ? `\n    <div class="correct-answer">正确答案：${escapeHtml(correctAns)}</div>` : ''}
  </div>`;
    }

    // 归因简述（仅认知定性；交叉检验结论统一在下方专属区展示，避免混入解释）
    const attributionText = q.errorPattern ? `错误模式=${q.errorPattern}` : '理解精准';

    return `<!-- ${q.id} -->
<div class="card ${cls}">
  <div class="card-head">
    <strong>${escapeHtml(q.id)} · ${escapeHtml(q.category)}</strong>
    <span class="tag ${tcls}">${escapeHtml(getCognitionLabel(q))}</span>${auditBadge}
  </div>${qaContentHtml}
  <p class="quote">「${escapeHtml(userQuote)}」</p>
  <p class="attribution">归因：${escapeHtml(attributionText)}</p>${narrativeHtml}${correctionHtml}${safePhraseHtml}
</div>`;
  }).join('\n');
}

// ---- 渲染交叉检验 ----
// 从维度内各题认知标签综合出维度级交叉结论（契约兜底：
// attribution.schema 的 dimensions 仅约定 {name,score}，status/reason 为可选增强）
function synthDimStatus(qs) {
  const labels = qs.map(q => getCognitionLabel(q));
  const has = t => labels.includes(t);
  if (has('不会')) return has('真懂') ? '一致性差，判为半懂' : '存在盲区';
  if (has('半懂') || has('模糊')) return has('真懂') ? '整体半懂，存在薄弱面' : '半懂';
  if (has('虚高')) return '掌握存疑（有虚高迹象）';
  if (has('表面懂')) return has('真懂') ? '部分表面化' : '表面掌握';
  if (labels.length === 1) return `${labels[0]}（单题，留待同维度验证）`;
  return '掌握扎实';
}

function renderCrossChecks(data) {
  const questions = data.questions || [];
  const dimQuestions = {};

  questions.forEach(q => {
    const cat = q.category;
    if (!dimQuestions[cat]) dimQuestions[cat] = [];
    dimQuestions[cat].push(q);
  });

  return Object.entries(dimQuestions).map(([dim, qs]) => {
    const tagList = qs.map(q => `${q.id} ${getCognitionLabel(q)}`).join(' + ');
    const dimObj = Array.isArray(data.dimensions) ? data.dimensions.find(d => d.name === dim) : null;
    // 结论优先级：显式 status > 认知标签综合；详情优先级：显式 reason > 每题 crossCheck
    const status = (dimObj && dimObj.status) || synthDimStatus(qs);
    let detail;
    if (dimObj && dimObj.reason) detail = escapeHtml(dimObj.reason);
    else {
      const lines = qs.filter(q => q.crossCheck).map(q =>
        `<div class="cross-detail">· ${escapeHtml(q.id)}：${escapeHtml(q.crossCheck)}</div>`);
      detail = lines.join('\n');
    }

    return `<div class="cross-check">
  <span class="dim-name">${escapeHtml(dim)}</span>：${escapeHtml(tagList)} → <strong>${escapeHtml(status)}</strong>
  ${detail ? '<br>' + detail : ''}
</div>`;
  }).join('\n');
}

// ---- 渲染行动计划 ----
function renderActionPlan(data) {
  const plan = data.actions || [];
  return plan.map(item => {
    const cls = actionClass(item.priority);
    const label = priorityLabel(item.priority);

    return `<div class="action-item ${cls}">
  <span class="priority">${escapeHtml(label)}</span>${escapeHtml(item.category)} — ${escapeHtml(item.action)}
  <span class="reason">${escapeHtml(item.reason || '')}</span>
</div>`;
  }).join('\n');
}

// ---- 主渲染函数 ----
function renderReport(data) {
  const dims = computeDimensionScores(data);
  const riskBadges = computeNarrativeRiskStats(data);
  const riskSummary = computeRiskSummary(data);
  const choiceStats = computeChoiceStats(data);
  const totalQuestions = data.quizMeta?.totalQuestions || data.overall?.totalQuestions || (data.questions || []).length || 0;
  const score = data.overall?.score || 0;
  const sessionId = data.sessionId || '';
  const title = data.title || data.quizMeta?.title || `InterviewForge 归因报告`;

  // 从 sessionId 提取日期时间
  const dateMatch = sessionId.match(/if-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})/);
  const dateTimeStr = dateMatch
    ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]} ${dateMatch[4]}:${dateMatch[5]}`
    : '';

  // 维度条形图
  const dimBarsHtml = dims.map(d => {
    const pct = d.score;
    return `<div class="dim-bar dim-bar--${band(d.score)}">
  <span class="name" title="${escapeHtml(d.name)}">${escapeHtml(d.name)}</span>
  <div class="bar"><div class="fill" style="width:${pct}%"></div></div>
  <span class="pct">${pct}%</span>
</div>`;
  }).join('\n');

  // 叙事风险概览 badges
  const riskBadgesHtml = riskBadges.map(b =>
    `<span class="risk-badge ${b.cls}">${escapeHtml(b.risk)} ×${b.count}</span>`
  ).join('\n  ');

  // 雷达图 JS 数据
  const radarDimsJson = JSON.stringify(dims);

  // 逐题卡片
  const cardsHtml = renderQuestionCards(data);

  // 交叉检验
  const crossCheckHtml = renderCrossChecks(data);

  // 面试风险总结
  const riskSummaryHtml = riskSummary.map(group => {
    const label = group.isHigh ? '危险' : '注意';

    // 聚合证据
    const evidences = group.items.map(it =>
      `${it.id} 中发现`
    ).join('、');

    return `<div class="summary-group ${group.isHigh ? 'is-high' : 'is-mid'}">
  <strong>${escapeHtml(label)}</strong>：${escapeHtml(group.risk)} — ${escapeHtml(evidences)}<br>
  <span class="summary-evidence">${escapeHtml(group.items[0]?.evidence?.substring(0, 80) || '')}</span>
</div>`;
  }).join('\n');

  // 行动计划
  const actionPlanHtml = renderActionPlan(data);

  // 高风险题数（按题去重）
  const highRiskCount = computeHighRiskQuestionCount(data);

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>InterviewForge 归因报告</title>
<style>
/* ---- tokens(:root)：默认主题；:root 之外禁止裸色值（L1 断言点） ---- */
:root{--rpt-bg:#1a1a2e;--rpt-text:#e0e0e0;--rpt-title:#7c8cf8;--rpt-h2:#a0a8e8;--rpt-h3:#c0c4f0;--rpt-meta:#8888aa;--rpt-card:#252547;--rpt-card-border:#444466;--rpt-bar:#333355;--rpt-qa:#1e1e3a;--rpt-sub:#b0b0d0;--rpt-risk-bg:#2a1a1a;--rpt-warn-bg:#2a2a1a;--rpt-safe-bg:#1a2a1a;--rpt-green:#66bb6a;--rpt-red:#ef5350;--rpt-orange:#ffa726;--rpt-blue:#42a5f5;--rpt-purple:#ab47bc}
/* ---- base ---- */
*{margin:0;padding:0;box-sizing:border-box}
body{background:var(--rpt-bg);color:var(--rpt-text);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.55;padding:24px;max-width:960px;margin:0 auto}
h1{font-size:1.6rem;color:var(--rpt-title);margin-bottom:4px}
h2{font-size:1.25rem;color:var(--rpt-h2);margin:20px 0 12px;border-left:3px solid var(--rpt-title);padding-left:10px}
h3{font-size:1.05rem;color:var(--rpt-h3);margin:16px 0 8px}
.meta{color:var(--rpt-meta);font-size:.85rem;margin-bottom:20px}
.section-accent::before{content:'\\25B2';color:var(--rpt-orange);font-size:.85em;margin-right:6px}
/* ---- layout ---- */
.score-section{display:flex;gap:16px;margin:16px 0;flex-wrap:wrap}
.card-head{display:flex;justify-content:space-between;align-items:center}
.risk-badges{display:flex;gap:12px;flex-wrap:wrap;margin:16px 0}
.risk-summary-list{margin:16px 0}
.canvas-wrap{text-align:center;margin:20px auto 0;max-width:min(100%,420px)}
canvas{width:100%;height:auto;max-width:100%}
/* ---- components ---- */
.score-card{background:var(--rpt-card);border-radius:10px;padding:20px;flex:1;min-width:180px;text-align:center}
.score-card .big{font-size:3rem;font-weight:700;color:var(--rpt-title)}
.score-card .label{font-size:.8rem;color:var(--rpt-meta);margin-top:4px}
.dim-bar{margin:6px 0;display:flex;align-items:center;gap:8px}
.dim-bar .name{min-width:76px;text-align:right;font-size:.8rem;color:var(--rpt-sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dim-bar .bar{flex:1;background:var(--rpt-bar);border-radius:4px;height:18px;position:relative;overflow:hidden}
.dim-bar .fill{height:100%;border-radius:4px;transition:width .3s}
/* 三档语义色（L3 §4 定案 high=green/mid=blue/low=orange）。选择器用属性子串匹配而非
   band 类名直写：e2e 契约（T7d）要求 dim-bar--{band} 记号在整份文档恰好出现 1 次，
   样式段若复写该记号会使计数翻倍。 */
.dim-bar[class*="--high"] .fill{background:var(--rpt-green)}
.dim-bar[class*="--mid"] .fill{background:var(--rpt-blue)}
.dim-bar[class*="--low"] .fill{background:var(--rpt-orange)}
.dim-bar .pct{font-size:.75rem;color:var(--rpt-meta);width:36px}
.card{background:var(--rpt-card);border-radius:10px;padding:16px;margin:12px 0;border-left:3px solid var(--rpt-card-border)}
.card.correct{border-left-color:var(--rpt-green)}
.card.wrong{border-left-color:var(--rpt-red)}
.card.partial{border-left-color:var(--rpt-orange)}
.tag{display:inline-block;padding:2px 8px;border-radius:10px;font-size:.75rem;margin:2px 4px 2px 0}
.tag-green{background:color-mix(in srgb,var(--rpt-green) 27%,transparent);color:var(--rpt-green)}
.tag-red{background:color-mix(in srgb,var(--rpt-red) 27%,transparent);color:var(--rpt-red)}
.tag-orange{background:color-mix(in srgb,var(--rpt-orange) 27%,transparent);color:var(--rpt-orange)}
.tag-blue{background:color-mix(in srgb,var(--rpt-blue) 27%,transparent);color:var(--rpt-blue)}
.tag-purple{background:color-mix(in srgb,var(--rpt-purple) 27%,transparent);color:var(--rpt-purple)}
.risk-badge{display:inline-block;padding:3px 10px;border-radius:10px;font-size:.72rem;margin:2px 4px 2px 0;font-weight:600}
.risk-high{background:color-mix(in srgb,var(--rpt-red) 27%,transparent);color:var(--rpt-red);border:1px solid color-mix(in srgb,var(--rpt-red) 40%,transparent)}
.risk-mid{background:color-mix(in srgb,var(--rpt-orange) 27%,transparent);color:var(--rpt-orange);border:1px solid color-mix(in srgb,var(--rpt-orange) 40%,transparent)}
.risk-ok{background:color-mix(in srgb,var(--rpt-green) 27%,transparent);color:var(--rpt-green);border:1px solid color-mix(in srgb,var(--rpt-green) 40%,transparent)}
.qa-block{margin:8px 0;padding:8px 12px;background:var(--rpt-qa);border-radius:6px;font-size:.88rem}
.qa-block .q{color:var(--rpt-h2);margin-bottom:4px}
.qa-block .a{color:var(--rpt-text)}
.qa-block .correct-answer{color:var(--rpt-green);margin-top:2px}
.quote{font-size:.85rem;color:var(--rpt-sub);margin-top:6px}
.attribution{font-size:.82rem;color:var(--rpt-meta);margin-top:4px}
.narrative-section{margin-top:8px;padding:8px 12px;background:var(--rpt-risk-bg);border-radius:6px;border-left:2px solid var(--rpt-red)}
.narrative-section.warn{background:var(--rpt-warn-bg);border-left-color:var(--rpt-orange)}
.narrative-evidence{font-size:.82rem;margin-top:4px}
.safe-phrase{background:var(--rpt-safe-bg);border-left:2px solid var(--rpt-green);padding:8px 12px;border-radius:6px;margin-top:6px;font-size:.85rem}
.cross-check{margin:12px 0;padding:10px 14px;background:var(--rpt-qa);border-radius:8px;border:1px solid var(--rpt-bar)}
.cross-check .dim-name{font-weight:600;color:var(--rpt-title)}
.cross-detail{font-size:.85rem;color:var(--rpt-sub);margin-top:3px}
.action-item{padding:10px 14px;margin:8px 0;border-radius:8px;border-left:3px}
.action-p0{background:var(--rpt-risk-bg);border-left-color:var(--rpt-red)}
.action-p1{background:var(--rpt-warn-bg);border-left-color:var(--rpt-orange)}
.action-p2{background:var(--rpt-safe-bg);border-left-color:var(--rpt-green)}
.action-item .priority{font-weight:700;font-size:.8rem;margin-right:8px}
.action-p0 .priority{color:var(--rpt-red)}
.action-p1 .priority{color:var(--rpt-orange)}
.action-p2 .priority{color:var(--rpt-green)}
.action-item .reason{font-size:.82rem;color:var(--rpt-sub)}
.summary-group{padding:10px;margin:6px 0;background:var(--rpt-warn-bg);border-radius:8px;border-left:3px solid var(--rpt-orange)}
.summary-group.is-high{background:var(--rpt-risk-bg);border-left-color:var(--rpt-red)}
.summary-group.is-high strong{color:var(--rpt-red)}
.summary-group.is-mid strong{color:var(--rpt-orange)}
.summary-evidence{font-size:.82rem;color:var(--rpt-sub)}
.audit-badge{display:inline-block;padding:2px 8px;border-radius:8px;font-size:.72rem;background:color-mix(in srgb,var(--rpt-orange) 20%,transparent);color:var(--rpt-orange);border:1px solid color-mix(in srgb,var(--rpt-orange) 33%,transparent);margin-left:6px}
.deep-research{margin-top:28px;padding:16px;background:linear-gradient(135deg,var(--rpt-card),var(--rpt-qa));border:1px solid color-mix(in srgb,var(--rpt-title) 27%,transparent);border-radius:12px;text-align:center}
.cta-note{margin-top:8px;font-size:.95rem}
/* ---- responsive ---- */
@media (max-width:820px){
  body{padding:16px}
  .score-section{flex-direction:column}
}
</style>
</head>
<body>

<h1>${escapeHtml(title)}</h1>
<p class="meta">${escapeHtml(dateTimeStr)} · ${COPY.sceneNote}</p>

<!-- 综合得分区 -->
<h2>综合得分</h2>
<div class="score-section">
  <div class="score-card">
    <div class="big">${score}</div>
    <div class="label">总分 / 100</div>
  </div>
  <div class="score-card">
    <div class="big">${choiceStats.correctCount}/${choiceStats.totalCount}</div>
    <div class="label">选择题正确${choiceStats.fallback ? '（按总体统计）' : ''}</div>
  </div>
  <div class="score-card">
    <div class="big">${highRiskCount}</div>
    <div class="label">叙事高风险题</div>
  </div>
</div>

<!-- 维度条形图 -->
<h2>维度得分</h2>
${dimBarsHtml}

<!-- 叙事风险概览 -->
<h2 class="section-accent">叙事风险概览</h2>
<div class="risk-badges">
  ${riskBadgesHtml}
</div>

<!-- 雷达图 -->
<h2>维度雷达</h2>
<div class="canvas-wrap">
  <canvas id="radar" width="400" height="400"></canvas>
</div>

<!-- 逐题复盘 -->
<h2>逐题复盘</h2>

${cardsHtml}

<!-- 交叉检验 -->
<h2>交叉检验结论</h2>

${crossCheckHtml}

<!-- 面试风险总结 -->
<h2>${COPY.riskSummaryTitle}</h2>
<div class="risk-summary-list">
${riskSummaryHtml}
</div>

<!-- 补强行动计划 -->
<h2>补强行动计划</h2>

${actionPlanHtml}

<!-- 深度研究提议 -->
<div class="deep-research">
  <p class="cta-note">${COPY.ctaText}</p>
</div>

<script>
// 雷达图
const canvas = document.getElementById('radar');
const _cs = getComputedStyle(document.documentElement);
const _v = (name, fb) => (_cs.getPropertyValue(name).trim() || fb);
const _RPT = { bar: _v('--rpt-bar','#333355'), sub: _v('--rpt-sub','#b0b0d0'), title: _v('--rpt-title','#7c8cf8') };
const ctx = canvas.getContext('2d');
const dims = ${radarDimsJson};
const cx = 200, cy = 200, r = 140;
const n = dims.length;
const angleStep = (2 * Math.PI) / n;

// 网格
for (let ring = 1; ring <= 4; ring++) {
  ctx.beginPath();
  const rr = r * ring / 4;
  for (let i = 0; i <= n; i++) {
    const a = -Math.PI/2 + i * angleStep;
    const x = cx + rr * Math.cos(a);
    const y = cy + rr * Math.sin(a);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.strokeStyle = _RPT.bar;
  ctx.lineWidth = 1;
  ctx.stroke();
}

// 轴线 + 标签
dims.forEach((d, i) => {
  const a = -Math.PI/2 + i * angleStep;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
  ctx.strokeStyle = _RPT.bar;
  ctx.stroke();
  const lx = cx + (r + 24) * Math.cos(a);
  const ly = cy + (r + 24) * Math.sin(a);
  ctx.fillStyle = _RPT.sub;
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(d.name, lx, ly);
});

// 数据区域
ctx.beginPath();
dims.forEach((d, i) => {
  const a = -Math.PI/2 + i * angleStep;
  const rr = r * d.score / 100;
  const x = cx + rr * Math.cos(a);
  const y = cy + rr * Math.sin(a);
  i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
});
ctx.closePath();
// 多边形填充跟随主题：从 --rpt-title 解析出的颜色派生 25% 透明度（浅色=品牌蓝、深色=淡紫，均随注入翻转）
const _titleHex = (_RPT.title || '#7c8cf8').replace('#','');
const _titleRgb = _titleHex.length === 3 ? _titleHex.split('').map(c => c + c).join('') : _titleHex;
ctx.fillStyle = 'rgba(' + [0, 2, 4].map(i => parseInt(_titleRgb.slice(i, i + 2), 16)).join(',') + ',0.25)';
ctx.fill();
ctx.strokeStyle = _RPT.title;
ctx.lineWidth = 2;
ctx.stroke();

// 数据点
dims.forEach((d, i) => {
  const a = -Math.PI/2 + i * angleStep;
  const rr = r * d.score / 100;
  const x = cx + rr * Math.cos(a);
  const y = cy + rr * Math.sin(a);
  ctx.beginPath();
  ctx.arc(x, y, 4, 0, 2 * Math.PI);
  ctx.fillStyle = _RPT.title;
  ctx.fill();
});
</script>

</body>
</html>`;
}

// ---- 主流程 ----
function main() {
  const { jsonPath, outputPath } = parseArgs();

  // 读取 JSON
  const raw = fs.readFileSync(jsonPath, 'utf-8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error(`Failed to parse JSON: ${e.message}`);
    process.exit(1);
  }

  // 渲染 HTML
  const html = renderReport(data);

  // 环境字段校验闸门（源码级，防模板残留）
  const problems = validateSource();
  if (problems.length > 0) {
    console.error('❌ 报告校验未通过：\n  ' + problems.join('\n  '));
    process.exit(1);
  }

  // 写入文件
  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  fs.writeFileSync(outputPath, html, 'utf-8');

  console.log(`✅ Report rendered: ${outputPath}`);
}


// ---- 环境字段校验闸门（防过时环境痕迹复发） ----
const ENV_BLOCKLIST = ['workbuddy', 'openclaw', 'vite', 'localhost', '5199', 'interview-forge-public'];
function validateSource() {
  const files = fs.readdirSync(__dirname).filter(f => /\.(c?js)$/.test(f))
    .concat(fs.readdirSync(path.join(__dirname, 'lib')).filter(f => /\.(c?js)$/.test(f)).map(f => 'lib/' + f));
  const problems = [];
  for (const file of files) {
    const src = fs.readFileSync(path.join(__dirname, file), 'utf8').replace(/const ENV_BLOCKLIST[\s\S]*?];/, '');
    const lower = String(src).toLowerCase();
    for (const term of ENV_BLOCKLIST) {
      if (lower.includes(term)) problems.push(file + ' 含环境痕迹: "' + term + '"');
    }
  }
  return problems;
}

module.exports = { renderReport };
if (require.main === module) main();
