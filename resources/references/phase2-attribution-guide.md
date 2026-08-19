# InterviewForge 归因分析参考手册

> **定位**：本文件是归因分析的**唯一权威定义层**。所有归因相关的标签、规则、示例、边界情况，均以本文件为准。
>
> 其他文件的引用关系：
> - `attribution-prompt.md`：执行编排层，只负责 prompt 结构 + 数据注入，标签定义引用本文件
> - `SKILL.md` 注意事项：只写原则性陈述 + "详见本文件"，不展开规则细节
> - `phase1-knowledge-lifecycle.md`：lifecycle 模型定义在自身，归因审计规则引用本文件

---

## 角色设定

你是一名**面试数据分析师**。你的工作方式：

1. **用标签，不用模糊评价** — 每道题必须归入明确的认知状态标签，不允许"还行""一般"这类表述
2. **用证据支撑结论** — 每个归因标签必须引用用户的原话作为证据
3. **做交叉检验** — 同一 category 下有多道题时，检验它们之间的认知一致性
4. **识别模式** — 不只看单题，要看全局：重复出现的错误模式是什么

---

## 认知状态标签

### 选择题（6 种）

| 选择结果 | 理由质量 | 标签 | 含义 |
|---------|---------|------|------|
| ✅ 对 | 理由正确，推理链完整 | `真懂` | 知识点已掌握 |
| ✅ 对 | 理由部分正确，有遗漏 | `半懂` | 核心知道但细节有缺口 |
| ✅ 对 | 理由错误或与答案无关 | `蒙对` | 答案碰对了但理解偏差，**隐患最大** |
| ❌ 错 | 理由方向正确但结论偏 | `半懂` | 直觉对但推理链断裂 |
| ❌ 错 | 理由错误 | `不会` | 明确的知识缺口 |
| ❌ 错 | 未填理由 | `未知` | 无法判断，按"不会"处理 |

### 开放题（4 种）

| 回答质量 | 标签 | 含义 |
|---------|------|------|
| 关键点完整，逻辑清晰 | `真懂` | 能自主结构化表达 |
| 提到部分关键点，逻辑有断链 | `半懂` | 能识别但无法串联 |
| 方向正确但缺乏具体内容 | `模糊` | 有印象但不深入 |
| 回答偏离或空白 | `不会` | 知识盲区 |

---

## 错误模式标签（5 种，必须从中选取，不可自造）

| 标签 | 定义 | 典型表现 |
|------|------|---------|
| `审题偏移` | 被题目措辞带跑注意力 | 只看前半句忽略限定词 |
| `单面理解` | 只理解知识的一面 | 知道"A 能做到"不知道"做不到会怎样" |
| `术语混淆` | 相似概念张冠李戴 | 两个概念互相串 |
| `知识盲区` | 完全没有概念 | 对该知识点完全陌生 |
| `推理断裂` | 直觉对但推理链不完整 | 知道结论但说不清为什么 |

---

## 叙事精度评估

> **核心原则**：技术面试不只考"知不知道"，更考"能不能精确表达"。答对但说得不精确，和答错一样危险——但更隐蔽。

### 评估维度

每道题（无论选择还是开放）在完成认知状态归因后，**必须额外评估叙事精度**，输出以下字段：

| 字段 | 含义 | 取值 |
|------|------|------|
| `narrativeRisks` | 叙事风险标签数组 | 从下方 7 种标签中选取 |
| `preciseCorrection` | 精确表述纠正 | 如果用户用词不精确，给出面试安全的替代表述 |
| `interviewSafePhrase` | 面试安全话术 | 如果是"不懂装懂"或"直接放弃"，给一句比"好像是"安全得多的话术 |

### 叙事风险标签（7 种）

| 标签 | 定义 | 面试后果 | 典型用户原话 |
|------|------|---------|------------|
| `模糊措辞` | 用"好像""大概""差不多"等词 | 暴露不自信，招来追问 | "好像是那个react-diff算法相关的东西吧" |
| `术语错误` | 用了错误的专业术语 | 被追问时卡壳 | 把 Render Props 说成"高阶组件" |
| `答非所问` | 没有回答面试官问的点 | 面试官认为理解偏差 | 问"模式名称"，答了一堆实现细节 |
| `不懂装懂` | 不确定但强行给出确定答案 | 追问必崩 | 不懂Vue立场却选"完全一样" |
| `直接放弃` | 明确表示不懂且不尝试 | 留下基础薄弱印象 | "这个完全不懂，我没接触过" |
| `过度推断` | 从有限信息推出错误结论 | 展示推理链漏洞 | 无key=卸载全部重建 |
| `版本盲区` | 回答了旧模式但未展示演进关系认知 | 暴露版本意识缺失 | 精确回答了Render Props但没提Custom Hooks |

### 评估规则

1. **选择题**：如果用户留了备注（note），必须检查备注中的措辞；如果没留备注，只评估答案本身的精确度
2. **开放题**：必须逐句扫描用户回答，识别所有叙事风险标签
3. **风险等级判定**：
   - 0 个风险标签 → ✅ 叙事安全
   - 1 个风险标签 → ⚠️ 需注意
   - 2+ 个风险标签 → 🚨 面试高风险
4. **纠正优先级**：`不懂装懂` > `术语错误` > `答非所问` > `模糊措辞` > `直接放弃` > `过度推断`

### 面试安全话术

当识别到 `直接放弃` 或 `不懂装懂` 时，必须输出 `interviewSafePhrase`：

```
"这个我不确定，我的理解是{用户当前认知}，但可能需要确认"
```

**目的**：比"好像是"或直接放弃好得多——既诚实又展示思考过程。

### 与认知状态标签的关系

叙事精度是认知状态标签的**补充层**，不是替代：

| 认知状态 | 叙事风险可能 | 典型组合 |
|---------|------------|---------|
| 真懂 | 低，但可能有 `术语错误` | 知道原理但说错了术语名 |
| 半懂 | 中，常有 `模糊措辞` | 核心知道但表述不精确 |
| 蒙对 | 高，常有 `不懂装懂` | 碰对了但备注暴露理解偏差 |
| 模糊 | 高，常有 `模糊措辞`+`答非所问` | 有印象但无法精确表达 |
| 不会 | 高，常有 `直接放弃` 或 `不懂装懂` | 最需要面试安全话术 |

---

## 版本意识评估

> **核心原则**：技术面试中，面试官问旧模式不是想知道你会不会用，而是看你有没有版本意识。回答"我会 X"但不提替代方案，比"不会"更危险——暴露了没有跟进现代实践。

### 评估字段

| 字段 | 取值 |
|------|------|
| `versionAwareness` | `demonstrated` / `absent` / `not-applicable` |

### 判定规则

| lifecycle.stage | 用户行为 | versionAwareness | 叙事风险 |
|-----------------|---------|-----------------|---------|
| `declining` | 主动提及 successor | `demonstrated` | 无 |
| `declining` | 只回答模式名称，未提 successor | `absent` | `版本盲区` |
| `declining` | 不知道模式名称 | 不适用 | 按 `知识盲区` 处理 |
| `dominant` | 不涉及版本演进 | `not-applicable` | 无 |
| `deprecated` | 任何 | 按 declining 规则处理 | 同上 |

**关键规则**：`declining` 题目中，即使用户答案正确，如果未提及 successor，也应标注 `versionAwareness: "absent"`。

### 与认知状态标签的关系

| 认知状态 | 版本意识缺失风险 | 典型组合 |
|---------|----------------|---------|
| 真懂 | 中——可能懂机制但没跟进替代 | `真懂` + `版本盲区` |
| 半懂 | 高——半懂更容易忽略版本上下文 | `半懂` + `版本盲区` |
| 蒙对 | 高——碰对了机制但没意识 | `蒙对` + `版本盲区` |
| 不会 | 不适用——连模式都不认识 | `不会` + `知识盲区` |

---

## 题目质量审计

> **核心原则**：归因不只审用户，也审题目。如果题目本身有缺陷，用户的薄弱可能不是用户的问题。

### 审计标签

| flag | 含义 | suggestedAction | 典型场景 |
|------|------|----------------|---------|
| `ok` | 题目质量合格 | keep | - |
| `legacy-without-context` | declining 阶段知识点，题目没带版本上下文 | rephrase-with-context | 只问"什么是Render Props"没问"现在用什么替代" |
| `weight-imbalance` | 同一 category 下 dominant 和 declining 题目权重失衡 | downgrade-weight | 组件组合维度中 3/5 题考 declining 模式 |
| `deprecated-as-main` | deprecated 知识点作为主考题 | remove-or-downgrade | 把 Vue.mixin 作为核心考点 |

### 审计流程

1. 读取每道题的 `lifecycle` 字段
2. 如果 lifecycle.stage 为 `declining` 或 `deprecated`，检查 stem 是否包含版本上下文
3. 如果 stem 缺少版本上下文（没有"现在用什么替代""和现代方案的区别"等追问），标记 `legacy-without-context`
4. 统计同一 category 下的 dominant vs declining 题目比例，declining 超过 30% 标记 `weight-imbalance`
5. deprecated 知识点如果作为独立主考题出现（不是辨析题的一部分），标记 `deprecated-as-main`
6. 审计结果写入归因 JSON 的 `questionAudit` 字段

### HTML 报告中的呈现

- 被审计标记的题目，在逐题复盘卡片中显示 ⚠️ 题目质量标注
- `legacy-without-context` 标记的题目，额外显示"该题未带版本上下文，用户的版本意识缺失可能部分归因于出题方式"
- 审计结果汇总在面试风险总结区中

---

## 归因后诊断映射

> **核心原则**：归因产出 weak points 后，需要标准化判断"下一步做什么"。不同类型的薄弱点需要完全不同的后续行动——知识缺口补内容，认知精度再测试，流程问题修流程。

### 诊断类型（3 种，必须从中选取）

| diagnosisType | 定义 | 典型信号 | 后续行动 |
|---------------|------|---------|---------|
| `knowledge-gap` | 文章/知识库未覆盖该知识点 | cognitionTag=不会 + errorPattern=知识盲区 + 文章无相关内容 | 补充文章内容（判断是否需要 deep-research 收集新知识） |
| `precision-gap` | 文章已覆盖但用户理解不精确 | cognitionTag=半懂/蒙对/模糊 + 文章有相关内容 + narrativeRisks 含模糊措辞/过度推断 | 再测一轮同维度题，确认是记忆模糊还是理解偏差 |
| `process-defect` | 题目本身有缺陷导致用户表现异常 | questionAudit.flag≠ok 或用户答题行为明显被题目激怒（如拒绝回答） | 修出题流程（如 declining 题加版本上下文），修后重测 |

### 判定映射表

综合 cognitionTag + errorPattern + narrativeRisks + questionAudit 判定：

| cognitionTag | errorPattern | questionAudit.flag | 诊断类型 | 典型场景 |
|-------------|-------------|-------------------|---------|---------|
| 不会 | 知识盲区 | ok | `knowledge-gap` | 完全不知道某个机制 |
| 半懂/模糊 | 单面理解 | ok | `precision-gap` | 知道一面但另一面不清楚 |
| 蒙对 | 任何 | ok | `precision-gap` | 答案碰对但理解偏差，隐患最大 |
| 任何 | 任何 | legacy-without-context | `process-defect` | declining 题没带版本上下文 |
| 任何 | 任何 | deprecated-as-main | `process-defect` | deprecated 知识点被当主考题 |
| 不会/半懂 | 知识盲区 | weight-imbalance | `process-defect` + `precision-gap` | 维度权重失衡 + 用户认知不足（双重行动） |

### recommendedAction 标准化值

| diagnosisType | recommendedAction 值 | 含义 |
|---------------|---------------------|------|
| `knowledge-gap` | `supplement-article` | 补充现有文章内容（官方文档有权威说明，不需要 deep-research） |
| `knowledge-gap` | `deep-research-needed` | 需要 deep-research 收集新知识（超出已有知识库范围） |
| `precision-gap` | `retest-same-dimension` | 再测一轮同维度，确认认知深度 |
| `precision-gap` | `retest-with-deep-dive` | 先深度对话学习，再测验证 |
| `process-defect` | `fix-quiz-flow` | 修出题流程（如 declining 题加版本上下文），修后重测 |
| `process-defect` + `precision-gap` | `fix-quiz-flow-then-retest` | 先修流程，再测用户认知 |

### 判定边界情况

1. **混合型**：如果同时存在 knowledge-gap 和 process-defect 信号（如文章没覆盖 + 题目也没带版本上下文），取 **knowledge-gap** 为主要诊断——先补知识，再修流程
2. **蒙对 vs 真懂**：蒙对一定标 `precision-gap`，不能因为答对就跳过
3. **版本意识强但题目差**：如果 versionAwareness=demonstrated 但 questionAudit.flag=legacy-without-context，标 `process-defect`——不是用户问题，是题目问题

---

## 交叉检验规则

当同一 category 下有多道题时，执行交叉检验：

| 题A | 题B | 归因结论 |
|-----|-----|---------|
| 真懂 | 真懂 | **掌握** — 该维度稳固 |
| 真懂 | 半懂/蒙对 | **表面懂** — 能选对但机制有缺口 |
| 半懂 | 半懂 | **半懂** — 核心知道但细节普遍缺失 |
| 蒙对 | 任何 | **虚高** — 需重点补强，分数不反映真实水平 |
| 不会 | 不会 | **盲区** — 需系统性补齐 |

---

## 输出格式

归因结果必须输出结构化 JSON（与 HTML 报告并行产出），格式：

```json
{
  "sessionId": "if-20260420-180000",
  "summary": {
    "score": 72,
    "totalQuestions": 8,
    "dimensions": {
      "架构对比": { "status": "掌握", "detail": "选择题和开放题均真懂" },
      "HMR": { "status": "表面懂", "detail": "选择题蒙对，开放题半懂" }
    },
    "narrativeRiskSummary": {
      "highRiskCount": 2,
      "highRiskDimensions": ["Reconciliation", "组件组合"],
      "topRiskType": "模糊措辞"
    }
  },
  "questions": [
    {
      "id": "q01",
      "category": "架构对比",
      "cognitionTag": "真懂",
      "errorPattern": null,
      "evidence": "用户原话：…",
      "crossCheck": "与 q04 交叉：q01 真懂 + q04 真懂 → 掌握",
      "narrativeRisks": [],
      "preciseCorrection": null,
      "interviewSafePhrase": null,
      "versionAwareness": "not-applicable",
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
      "recommendedAction": "supplement-article",
      "action": "补强建议",
      "reason": "归因依据"
    }
  ]
}
```

---

## 使用方式

本文件由 SKILL.md 阶段2 自动引用。Agent 在归因前读取本文件，按角色设定和标签体系执行结构化归因，输出 JSON + HTML。
