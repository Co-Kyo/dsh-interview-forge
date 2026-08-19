# InterviewForge 速练 — 标准 DSH 宿主插件（完整可分发包）

把 InterviewForge 速练从"动态 harness 插件（会话内存、重启即失）"改造为**一套完整的标准 DSH 插件 bundle**：
随 dsh 启动加载、进程重启不丢、可在本地（私有，无需开源 GitHub）安装。

- 出题：`forge_start` — 把符合 `quiz.schema.json` 的题库落盘并创建会话
- 归因/报告：`forge_result` 取结果 → subagent 归因 → `resources/render-report.cjs` 渲染 → `forge_report_ready` 登记
- 资源随包：`resources/schemas`、`resources/references`、`resources/render-report.cjs`

## 安装（本地，无需 GitHub）
```bash
# 方式 A：本地目录
dsh plugin --profile web add ./forge-plugin
# 方式 B：压缩包（先 pnpm pack 打出 interview-forge-plugin-0.1.0.tgz）
dsh plugin --profile web add ./interview-forge-plugin-0.1.0.tgz
```
装好后 profile 的 `cordis.patch.yml` 挂载 `interview-forge` 行（见本包 `cordis.patch.yml`），重启 `dsh web` 即随启动加载。

> 说明：`dsh plugin add` 是把参数转发给 profile 目录里的 **pnpm**，pnpm 天然支持本地路径与 tarball，所以完全不必开源。

## 工程结构
```
forge-plugin/
  package.json          # interview-forge-plugin + dsh.bundle.patch → cordis.patch.yml
  cordis.patch.yml      # 插件行挂载（host；client 见下）
  lib/index.js          # host 半边：标准宿主插件 apply(ctx)，三工具 ctx.tools.register(defineTool)
  lib/service.js        # （下一阶段）host 跨端数据层 TypertRemoteService
  lib/client.js         # （下一阶段）client 半边：ctx.slots 速练 UI + ctx.remote 调 host
  resources/            # 随包分发：quiz/attribution schema、references 归因规范、render-report.cjs(+e2e)
```

## host 半边能力（当前已实现并 loader 集成验证通过）
- `ctx.tools.register(defineTool(...))` 注册：
  - `forge_start`：题库落盘 `interview-forge-archive/sessions/{date}/quiz-{sid}.json`，建会话
  - `forge_result`：取最新（或指定）会话结果
  - `forge_report_ready`：读 `report-{sid}.html` 标记报告就绪
- 数据**双持久**：内存 Map + 磁盘 archive；启动（重启后）可从磁盘扫描恢复历史（schedule 会话/报告/历史看板）。
- 主进程 loader 合成已由 `dsh --profile web --patch … --dump-config` 验证并入（无包解析失败）。

## 数据路径（重启不丢）
```
{workspace}/interview-forge-archive/sessions/{YYYY-MM-DD}/
  quiz-{sid}.json / result-{sid}.json / attribution-{sid}.json / report-{sid}.html / seed-{sid}.json
```

## 当前状态与下一步
- ✅ host 半边标准 bundle：工具、磁盘持久、loader 集成验证、资源随包、本地安装打 tarball。
- ⏳ client 半边（⚡速练浮层/答题/报告 UI）：`ctx.slots` 注册已兼容，但跨端 `host.call → ctx.remote.<svc>` 需宿主
  `TypertRemoteService`（TS + typert 生成管线）——DSH 为 preview，建议用官方 `dsh-plugin-development` 脚手架
  生成 TS 工程后实现（见 README 顶部说明）。

## 注意
- DSH 处于开发者预览，接口可能有破坏性变更；固定依赖版本（`@deepseek-ai/dsh-tools@0.1.0-rc.7`）。
- 仅公开 host bundle 时，答题交互仍由 agent 在对话内引导；浏览器实时浮层 UI 待 client 半边接入后启用。
