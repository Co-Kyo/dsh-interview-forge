# InterviewForge 出题格式规范

> 本文件供 Agent 在生成题库前拉取，确保输出的 JSON 符合 InterviewForge 系统的输入要求。

---

## 格式定义

**结构合同（权威源）**：读取 `{SKILL_DIR}/Tools/interview-forge-public/schemas/quiz.schema.json`

生成的题库 JSON **必须通过该 Schema 的结构校验**。Schema 定义前端实际消费的字段（id/type/category/stem/options/answer/explanation），以下为 Schema 无法表达的语义补充规则。

> **关于扩展字段**：Schema 对 question 设置了 `additionalProperties: true`，允许 Skill 管道附加内部字段（如 `lifecycle`）。这些扩展字段不由前端消费，前端会自动忽略。扩展字段的格式定义见本文档第 4 节。

---

## 1. 题型语义规则

### 选择题（choice）

- 选项数量推荐 4 个，允许 3~5 个
- **必须有且仅有一个正确答案**
- 干扰项要有区分度，不能明显错误
- 选项长度尽量均匀，避免正确选项明显更长/更短
- 正确选项不能是"以上都对"或"以上都错"
- **答案分布均匀**：整套题库的选择题，正确答案应尽量均匀分布在各选项上。任意单个选项占比不得超过 40%。例如 8 道选择题，ABCD 各 2 个最优，某个选项 3 个可接受，但 5 个以上必须调整

### 开放题（open）

- stem 要有开放性，不能是简单的"是/否"问题
- 最好考察知识整合能力，而非单一知识点回忆
- 建议用"你会怎么做""请描述你的思路""如何理解"等引导语

---

## 2. 编排规则

1. **题型比例**：选择题 : 开放题 ≈ 3:1 ~ 4:1。6 题配 2 开放，8 题配 2 开放，10 题配 2~3 开放
2. **题目总数**：5~12 题为宜。太短归因无意义，太长用户疲劳
3. **交叉编排**：同 category 的选择题和开放题应穿插出现，方便归因交叉检验
4. **难度递进**：建议从基础选择题开始，逐步深入，开放题放在中后段
5. **category 设计**：每个 category 至少 2 题（否则无法做维度分析），3~5 个 category 为宜，2~4 字维度名

---

## 3. 出题质量要求

1. **stem（题干）**：
   - 表述清晰，无歧义
   - 选择题的 stem 应该是一个完整的问题或判断句
   - 避免双重否定
   - **代码块必须用 Markdown 语法包裹**：stem 中包含代码片段时，必须使用 `` ``` `` 围栏代码块语法。前端使用 `marked.js` 渲染，只有 Markdown 代码块才会被渲染为等宽字体+深色背景的代码容器，裸文本会被渲染为普通段落，缩进和格式全部丢失
   - 正确示例：
     ```json
     "stem": "以下代码输出什么？\n\n```js\nconst [count, setCount] = useState(0);\nconsole.log(count);\n```\n\n请选择正确答案。"
     ```
   - 错误示例（裸文本，**禁止**）：
     ```json
     "stem": "以下代码输出什么？\n\nconst [count, setCount] = useState(0);\nconsole.log(count);\n\n请选择正确答案。"
     ```
   - 行内变量/函数名用反引号包裹：`` `useState` ``、`` `count` ``
   - 代码块语言标注推荐：`js`/`jsx`/`ts`/`tsx`，帮助阅读但前端不做语法高亮

2. **explanation（解析）**：
   - 简明扼要点出关键知识点
   - 一句话即可，不要长篇大论
   - 推荐填写，帮助用户理解为什么对/错

---

## 4. Skill 扩展字段：lifecycle

> lifecycle 是 Skill 管道的内部概念，用于出题时的版本意识约束和归因阶段的权重参考。前端不消费此字段，但 JSON 天然可扩展，前端会自动忽略。

**每道题必须附加 `lifecycle` 字段**，格式定义如下：

```json
"lifecycle": {
  "stage": "dominant",           // 必填：experimental | adopted | dominant | declining | deprecated
  "successor": "Custom Hooks",   // 选填：declining/deprecated 时必填，替代方案名称
  "interviewSignal": "直接回答"  // 选填：面试回答策略提示
}
```

- `stage` 为 `dominant` 且无 successor 时，可简化为 `"lifecycle": { "stage": "dominant" }`
- `stage` 为 `declining` 或 `deprecated` 时，`successor` **必填**
- **declining 知识点的 stem 必须带版本上下文**（如"什么是 Render Props？现在通常用什么替代？"）
- **deprecated 知识点不应作为主考题**

完整的 lifecycle 审计规则（declining 占比限制、一致性检查、常见技术栈预设等）详见 `phase1-knowledge-lifecycle.md`。

---

## 5. 格式示例

以下示例展示具体填写方式，字段定义以 Schema 为准：

### 选择题

```json
{
  "id": "q01",
  "type": "choice",
  "category": "架构对比",
  "lifecycle": { "stage": "dominant" },
  "stem": "关于 Webpack 和 Vite 的核心架构差异，以下哪个说法最准确？",
  "options": [
    { "key": "A", "text": "Vite 不做任何编译，直接让浏览器运行源码" },
    { "key": "B", "text": "Webpack 是 Bundle 模式，Vite 开发时是 Bundleless 模式" },
    { "key": "C", "text": "Vite 用 esbuild 全量打包" },
    { "key": "D", "text": "架构没有本质区别，Vite 快因为用了 Rust" }
  ],
  "answer": "B",
  "explanation": "Bundle vs Bundleless + 浏览器原生 ESM 按需加载"
}
```

### 开放题

```json
{
  "id": "q05",
  "type": "open",
  "category": "构建优化",
  "lifecycle": { "stage": "dominant" },
  "stem": "如果给你一个体积庞大的老 Webpack 项目，让你做构建提效，你会从哪些维度排查和优化？请尽可能详细地描述你的思路。"
}
```

### lifecycle 标注示例

```json
"lifecycle": { "stage": "dominant" }
"lifecycle": { "stage": "declining", "successor": "Hooks" }
"lifecycle": { "stage": "experimental", "interviewSignal": "了解即可" }
```

> `stage` 为 `dominant` 且无 successor 时可简化；`declining`/`deprecated` 时 `successor` 必填。
