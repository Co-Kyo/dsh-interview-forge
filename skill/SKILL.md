# InterviewForge 速练 — 快速练习 + 快速反馈

> 本 skill 由 `dsh-interview-forge` 插件**随包提供**（skill provider 挂载），与插件的 forge_* 工具、⚡ 浮层 UI 同版本发布，无需单独安装。

**定位**：本系统**不是模拟面试**。它是用户在准备面试或学习某一主题时，通过「快速出题 → 对话内快速答题 → 交叉检验与归因 → 雷达反馈报告」来**自检掌握程度**的训练平台。计时器制造轻度节奏压力、选择题必须填写选择理由，都是为了逼出真实掌握度，供后续归因使用。

**前端仓库**：https://github.com/Co-Kyo/interview-forge-public （Vue 版参考实现；DSH 内以标准插件形态内化，无需启动 Vite 服务）

---

## 前置步骤：forge 插件就绪检查（每次 Skill 启动必做）

本 skill 依赖同包的三个宿主工具。先确认可用：

1. 尝试调用任一 `forge_*` 工具（如无参调用 `forge_result`），或检查当前会话工具列表中是否存在 `forge_start` / `forge_result` / `forge_report_ready`
2. **存在** → 就绪，进入流程
3. **不存在** → 插件未安装或未重启生效。让用户执行：

   ```sh
   # 方式 A：Release tarball（预构建）
   dsh plugin --profile web add ./dsh-interview-forge-<版本>.tgz
   # 方式 B：Git 直装
   dsh plugin --profile web add github:Co-Kyo/dsh-interview-forge#main

   # 装完重启 dsh web 生效
   ```

   安装后等用户重启并重新触发练习，本轮终止。

## 档案路径

- 默认档案目录：`{cwd}/interview-forge-archive/`
- 会话目录：`sessions/{YYYY-MM-DD}/`，文件：`quiz-{sessionId}.json`、`result-{sessionId}.json`、`attribution-{sessionId}.json`、`report-{sessionId}.html`
- sessionId 格式：`if-{YYYYMMDD-HHmmss}`
- 调用 `forge_start` 前先执行 `mkdir -p {归档目录}/sessions`

---

## 阶段 1：出题 + 启动

### Step 0：提炼练习目标
读取 `references/phase0-direction-assessment.md`。从用户话语提取话题/目的/差距三类信号（A 逻辑），无法收束时用 ask_user_question 追问（B 逻辑）。目标一旦确定贯穿本次练习。

### Step 1：拉取规范
- `schemas/quiz.schema.json`（结构合同，出题结果必须通过校验）
- `references/phase1-quiz-format.md`（语义规则：题型、编排、答案分布、lifecycle）
- `references/phase1-goal-decomposition.md`（目标逆向拆解：组件→证据→题目）
- `references/phase1-knowledge-lifecycle.md`（知识生命周期，必读）

### Step 2：生成题库
按 goal-decomposition 的拆解逻辑出 5~12 题（choice:open ≈ 3:1~4:1，同 category 至少 2 题便于交叉检验），choice 题必带 options+answer，每题标注 `lifecycle`。

**质量自检（生成后必做，不可跳过）**：
- 每个知识组件至少 1 题覆盖；evidence 类型对齐
- 答案分布：任意选项占比 ≤ 40%
- 4 个选项有竞争性，有且仅有一个正确答案
- stem/options 中的代码片段用 `` ``` `` 围栏代码块
- lifecycle 标注：declining 的 stem 带版本上下文、deprecated 不作主考题、declining 占比 ≤ 30%
- meta.totalQuestions 与 questions 长度一致，ID q01 开始连续编号
- **JSON 安全**：stem/options 禁止中文引号（""），用「」或英文引号

### Step 3：启动
1. `mkdir -p {归档目录}/sessions`
2. 调用 `forge_start`：quiz=题库JSON，archiveDir={归档目录}

### Step 4：告知用户
提示：练习已启动，点击 Web 右下角「⚡」速练浮层打开队列，点击该项进入答题模态框；最小化/关闭即暂停计时。点「完成练习」后插件自动跳转到对应会话并发送「答完了」触发反馈阶段。

---

## 阶段 2：交叉检验 + 反馈报告

### Step 1：定位结果
用户完成练习后插件已自动向对话发送「答完了」。调用 `forge_result`（默认返回最新一场），取回 `{ quiz, result, quizPath, resultPath }`。若 result 为空或 status 非 completed，提示用户先完成答题。

### Step 2：归因分析（由独立上下文 subagent 执行，防主会话上下文污染）

> **为什么用 subagent**：归因质量对上下文纯净度敏感。主会话积累了练习对话、工具调用等噪音，直接在主会话执行归因会被污染；**必须启动一个独立上下文的 subagent**，让它重新读取 skill 规范 + 题库 + 答题结果，在干净上下文里完成归因。主会话只负责：启动 subagent → 校验产物 → 渲染登记。

**subagent prompt 模板（自包含，主会话原样发出，不注入主会话内容；`{SKILL_DIR}` 替换为本 skill 的 base directory 绝对路径）**：

```
你是 InterviewForge 归因分析子代理，在独立上下文中为一次速练生成归因结果。不要臆测，严格按文件规范执行。

步骤：
1. 用 read 工具读取以下文件（全部必读）：
   - {SKILL_DIR}/references/phase2-attribution-prompt.md（归因执行编排：步骤结构与输出格式）
   - {SKILL_DIR}/references/phase2-attribution-guide.md（归因标签与交叉检验规则权威来源）
   - {SKILL_DIR}/schemas/attribution.schema.json（输出契约，字段必须符合）
   - {quizPath}（题库）
   - {resultPath}（答题结果）
2. 按 prompt 编排执行完整归因：逐题认知标签（cognitionTag）、证据（evidence 引用用户原话）、交叉检验（crossCheck）、叙事风险（narrativeRisks）、精确表述纠正（preciseCorrection）、题目质量审计（questionAudit）、维度得分（dimensions）、综合得分（overall）、补强行动计划（actions，含 diagnosisType）。
3. 输出必须符合 attribution.schema.json 的结构，用 write 工具写入：
   {attributionPath}
4. 回复：写入成功与否 + questions 数量 + overall.score。
```

执行要点：
- subagent 用 `subagent` 工具（**独立上下文**，不用 subagent_fork——fork 会继承主会话上下文，违背隔离目的）
- `{SKILL_DIR}` = 本 skill 的 base directory；`{quizPath}`/`{resultPath}` = Step 1 从 forge_result 取回的路径；`{attributionPath}` = 归档目录下 `attribution-{sessionId}.json`
- **校验产物**：subagent 返回后，主会话 read attribution JSON，确认顶层含 sessionId/title/quizMeta/overall/dimensions/questions/actions 且 questions 非空；缺失/异常则让 subagent 重跑
- 归因字段契约：顶层 sessionId/title/quizMeta/overall/dimensions/questions/actions；题目含 cognitionTag/evidence/crossCheck/narrativeRisks/preciseCorrection

### Step 3：渲染雷达报告
```bash
node {SKILL_DIR}/scripts/render-report.cjs --json {归档目录}/sessions/{date}/attribution-{sessionId}.json --output {归档目录}/sessions/{date}/report-{sessionId}.html
```

**渲染脚本内置环境字段校验闸门**：模板源码出现过时环境痕迹（workbuddy/openclaw/vite/localhost/5199 等黑名单词）即报错退出（exit 1），输出 `✅ Report rendered` 才表示通过。**校验失败时不要调用 forge_report_ready**，先修复归因数据/模板后重试。

**渲染完成后必须调用 `forge_report_ready`（sessionId, reportPath）通知插件**：队列条目会变为「报告就绪」，用户点击即可在模态框内查看报告。

### Step 4：告知用户 + 差异化建议
按 diagnosisType 提议：`knowledge-gap` → 补充文章/深度研究；`precision-gap` → 再测一轮同维度；`process-defect` → 修流程重测。混合型按 process-defect > knowledge-gap > precision-gap 优先级排列。

### Step 5（可选）：深度研究推进（仅用户确认后）
按归因结果中的 P0 薄弱点做针对性研究：优先官方文档/权威来源，跳过 zhihu/csdn 等，产出 `deep-research-{sessionId}.md`。

---

## 运维

- 「答完了/练习完成/出反馈」= 触发阶段 2（有结果要处理）
- 数据全部落盘于档案目录，进程重启不丢；历史在 ⚡ 浮层的「历史」日历中浏览
- 卸载插件：`dsh plugin --profile web remove dsh-interview-forge`（本 skill 随之消失）

## 注意事项

1. 出题前必须先读 direction-assessment、goal-decomposition、quiz-format、knowledge-lifecycle；归因前必须先读 attribution-guide 和 attribution-prompt
2. 前端渲染仅消费 schema 字段，lifecycle 等扩展字段自动忽略
3. sessionId 用 `if-{YYYYMMDD-HHmmss}` 保证唯一
4. 一次练习的产出 = 归因 JSON + HTML 报告（反馈），不是分数
