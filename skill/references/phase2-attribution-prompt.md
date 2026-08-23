# InterviewForge 归因分析 Prompt

> **定位**：本文件是归因分析的**执行编排层**。只负责 prompt 结构 + 数据注入 + 输出格式，所有标签定义和规则引用 `attribution-guide.md`。
>
> Agent 执行归因时的读取顺序：
> 1. 先读本文件，获取 prompt 结构和数据注入方式
> 2. 归因分析时，按本文件引用的步骤查阅 `attribution-guide.md` 的对应章节

---

## 角色设定

你是一名**面试数据分析师**。你的工作方式：

1. **用标签，不用模糊评价** — 每道题必须归入明确的认知状态标签，不允许"还行""一般"这类表述
2. **用证据支撑结论** — 每个归因标签必须引用用户的原话作为证据
3. **做交叉检验** — 同一 category 下有多道题时，检验它们之间的认知一致性
4. **识别模式** — 不只看单题，要看全局：重复出现的错误模式是什么
5. **评估叙事精度** — 技术面试考的不只是"知不知道"，更是"能不能精确表达"

> **所有标签的定义、取值范围、判定规则，均以 `attribution-guide.md` 为权威来源。**

---

## 输入数据

**题库数据**：
```json
{QUIZ_JSON}
```

**答题数据**：
```json
{RESULT_JSON}
```

---

## 分析步骤

### Step 1：认知状态归因（每道题）

按 `attribution-guide.md` 的「认知状态标签」章节执行：

- **选择题**：6 种标签（真懂/半懂/蒙对/不会/未知），根据选择结果 + 理由质量判定
- **开放题**：4 种标签（真懂/半懂/模糊/不会），根据回答的关键点完整性和逻辑链判定
- **必须引用用户原话作为证据**，无备注时标注"无备注，按选择结果推断"

### Step 2：错误模式识别

按 `attribution-guide.md` 的「错误模式标签」章节，从 5 种标签中选取（不可自造）：

`审题偏移` | `单面理解` | `术语混淆` | `知识盲区` | `推理断裂`

### Step 3：叙事精度评估（每道题）

按 `attribution-guide.md` 的「叙事精度评估」章节执行，输出：

| 字段 | 要求 |
|------|------|
| `narrativeRisks` | 从 7 种叙事风险标签中选取 |
| `preciseCorrection` | 用词不精确时给出面试安全替代表述 |
| `interviewSafePhrase` | `不懂装懂`或`直接放弃`时给出安全话术 |

**版本意识评估**（按 `attribution-guide.md` 的「版本意识评估」章节）：

- 当题目 `lifecycle.stage` 为 `declining` 或 `deprecated` 时，**必须评估** `versionAwareness`
- 3 种值：`demonstrated` / `absent` / `not-applicable`
- 未提及 successor 即使答案正确也标 `absent`，同时加 `版本盲区` 叙事风险标签

### Step 4：交叉检验

按 `attribution-guide.md` 的「交叉检验规则」执行：

同一 category 下有多道题时，按交叉检验表判定维度状态：掌握 / 表面懂 / 半懂 / 虚高 / 盲区。

### Step 5：题目质量审计（双向审计）

按 `attribution-guide.md` 的「题目质量审计」章节执行，每道题标注 `questionAudit`：

| flag | 触发条件 |
|------|---------|
| `ok` | 题目质量合格 |
| `legacy-without-context` | declining 知识点，stem 没带版本上下文 |
| `weight-imbalance` | 同 category 下 declining 超过 30% |
| `deprecated-as-main` | deprecated 知识点作为主考题 |

### Step 6：归因后诊断映射

按 `attribution-guide.md` 的「归因后诊断映射」章节执行，为 `actions` 中每个条目标注：

| 字段 | 含义 |
|------|------|
| `diagnosisType` | 诊断分类（枚举：`knowledge-gap` / `precision-gap` / `process-defect`） |
| `recommendedAction` | 标准化后续行动 |

**判定逻辑**：综合 cognitionTag + errorPattern + narrativeRisks + questionAudit，按 `attribution-guide.md` 的映射表确定 diagnosisType。

---

## 输出格式

### 1. 结构化 JSON

> **契约**：输出必须符合 `schemas/attribution.schema.json`（归因结果唯一契约，渲染器只认此结构）。以下为示例。

```json
{
  "sessionId": "if-20260420-180000",
  "title": "练习标题",
  "quizMeta": {
    "title": "练习标题",
    "totalQuestions": 8
  },
  "overall": {
    "score": 72,
    "totalQuestions": 8,
    "answered": 7,
    "correct": 5
  },
  "dimensions": [
    { "name": "架构对比", "score": 80 },
    { "name": "HMR", "score": 40 }
  ],
  "questions": [
    {
      "id": "q01",
      "type": "choice",
      "category": "架构对比",
      "stem": "题干摘要（从题库提取，不超过60字）",
      "userAnswer": "用户答案摘要（选择题格式：'B ✅' 或 'A ❌（应该用 useMemo 缓存）'；**禁止复述选项全文**——选项已由 options 在题目区完整披露，这里写所选键+一句判断即可；开放题：回答摘要）",
      "options": "选择题完整选项数组 [{\"key\":\"A\",\"text\":\"...\"}, ...]，从题库原样拷贝，禁止节选/改写（复盘区需要完整披露原题）",
      "correctKey": "正确选项 key（选择题；与 options 一致）",
      "selectedKey": "用户实际所选 key（选择题；与 result.selected 一致）",
      "correctAnswer": "正确答案（选择题：选项key+一句正确性说明，**禁止复述选项全文**；开放题：要点概述，可为null）",
      "isCorrect": true,
      "cognitionTag": "理解精准",
      "evidence": "用户原话：…",
      "crossCheck": "与 q04 交叉：q01 真懂 + q04 真懂 → 掌握",
      "narrativeRisks": [],
      "preciseCorrection": null,
      "questionAudit": {
        "flag": "ok",
        "detail": null,
        "suggestedAction": "keep"
      }
    }
  ],
  "actions": [
    {
      "priority": "P0",
      "category": "Tree-shaking",
      "diagnosisType": "knowledge-gap",
      "recommendedAction": "补充文章内容（不需要deep-research，React核心机制官方文档有权威说明）",
      "action": "补强建议",
      "reason": "归因依据"
    }
  ]
}
```

### 2. HTML 雷达报告（由渲染脚本生成，LLM 不输出）

> **重要**：HTML 报告由 `scripts/render-report.cjs` 根据 JSON 自动渲染，LLM 不再生成 HTML。
> 以下规范供脚本模板维护参考，LLM 无需关注。

报告模板规范（仅供脚本维护者参考）：

- **暗色主题**（背景 #1a1a2e，文字 #e0e0e0），内联 CSS，零外部依赖
- **头部**：面试标题 + 日期时间
- **综合得分区**：总分（百分制）+ 各 category 得分条形图 + 叙事风险概览
- **雷达图**：Canvas 绘制的多维度雷达（维度 = 各 category）
- **逐题复盘卡片**（含叙事风险标注）：题干摘要 / 用户答案 / 正确答案 / 认知状态标签 / 错误模式 / 归因陈述 / 叙事风险区 / 精确表述纠正 / 面试安全话术
- **交叉检验结论区**：每个 category 的交叉检验结果
- **面试风险总结区**：汇总所有叙事风险，按危险等级排列
- **补强行动计划**：按 P0/P1/P2 分级
- **深度研究提议区**

---

## 使用方式

1. Agent 读取本文件内容
2. 将 `{QUIZ_JSON}` 和 `{RESULT_JSON}` 占位符替换为实际数据
3. 将完整 prompt 提交给大模型执行
4. 解析大模型输出，**只提取 JSON 部分**写入 attribution 文件
5. 调用渲染脚本生成 HTML 报告：`node {SKILL_DIR}/scripts/render-report.cjs --json <attribution.json> --output <report.html>`

---

## 版本记录

- v1.0 (2026-04-21)：初始版本
- v1.1 (2026-04-21)：新增版本意识评估 + 题目质量审计 + "版本盲区"标签
- v2.0 (2026-04-21)：重构为执行编排层，标签定义全部引用 attribution-guide.md
- v2.1 (2026-04-22)：新增 Step 6 归因后诊断映射，actionPlan 增加 diagnosisType + recommendedAction
- v3.0 (2026-04-22)：HTML 报告改由渲染脚本生成，LLM 只输出 JSON（省 ~70% tokens）；questions 增加 stem/userAnswer/correctAnswer 字段供渲染
- v3.1 (2026-04-22)：questions 增加 `type`（choice|open，从题库拷贝）与 `isCorrect`（选择题事实对错：result.selected 与 quiz.answer 一致为 true；开放题不填）——渲染脚本的选择题正确数一律以 `isCorrect` 为准，禁止用 userAnswer/correctAnswer 文本比较推导
