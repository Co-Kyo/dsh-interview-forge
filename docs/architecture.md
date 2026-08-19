# InterviewForge 速练 — 静态化插件工程 · 架构说明

> 目的：把 InterviewForge 从"动态 harness 插件"（会话内存、重启即失）改造为**完整可分发的标准 DSH 宿主插件 bundle**：本地安装（私有、无需开源 GitHub）、随 dsh 启动自动加载、进程重启后不丢失、数据（题库/结果/归因/报告）磁盘持久可恢复。

- **运行模式**：`installable bundle`（依据 `dsh-plugin-development` skill → `references/installable-bundle.md`）。
- **生命周期**：`package.json#dsh.bundle.patch` 声明补丁文件；`cordis.patch.yml` 挂载插件行；profile 叠加 bundle 层后由 loader 随启动实例化。
- **分发**：`dsh plugin add` 底层转发给 profile 的 **pnpm**，支持本地路径与 tarball → 全程私有、无需开源。

## 三层结构

| 层 | 职责 | 状态 |
| --- | --- | --- |
| host 半边（Node） | 三工具 + 数据权威 + 磁盘持久 archive | ✅ 已实现、已随启动常驻验证 |
| client 半边（浏览器） | 速练浮层 UI（⚡FAB/答题/报告/历史） | ⏳ 规划/实现中（跨端） |
| 归因+渲染 | subagent 独立上下文归因 → `resources/render-report.cjs` 出 HTML 报告 | ✅ 已有（随包） |

## 目录

```
forge-plugin/
  package.json       # interview-forge-plugin + dsh.bundle.patch → cordis.patch.yml
  cordis.patch.yml   # 插件行挂载（host 已挂；client 待挂）
  lib/index.js       # host 半边：ctx.tools.register(defineTool) × 3 + 磁盘持久
  src/（规划）          # host src/forge-gateway.ts（TypertRemoteService）+ client/index.ts
  resources/         # quiz/attribution schema、references 归因规范、render-report.cjs(+e2e)
  docs/              # 本目录：架构 + 任务进度
```

## host 半边（已实现）

- 注册：`ctx.tools.register(defineTool({...}))×3` — `forge_start` / `forge_report_ready` / `forge_result`。
- 依赖：`inject ['sessions','tools']`；`ctx.get('fs')`。
- 持久：`interview-forge-archive/sessions/{date}/quiz|result|attribution|report|seed-*.{json,html}`，重启可从磁盘 scanArchive 恢复历史。
- 随启动：profile `cordis.patch.yml` 挂 `interview-forge` 行 + profile `node_modules` 本地 link。
- 验证证据：
  - `dsh --profile web --patch … --dump-config` → interview-forge 并入合成树，无包解析失败；
  - skill `scripts/check-artifact.mjs bundle` → **PASS, 0 warning**；
  - 运行时探针（注入宿主 tools 全局注册表）→ `forge_start/forge_result/forge_report_ready` 均在、`get('forge_start')=true`。

## client 半边（待实现，跨端）

- UI 注册：`ctx.slots.inject('shell.overlay', () => ctx.slots.register({...}))` 渲染 ⚡FAB/答题/报告/历史。
- 数据通路：`ctx.remote.forge.<method>()`（host 侧 `TypertRemoteService` + typert 声明；client inject `['slots','remote']`）。
- 核心约束：跨端只能走 `ctx.remote`（官方 prior art：`packages/client/ui-goal/src/client/index.ts` 用 `ctx.remote.goals.*`），**无法用纯 JS 绕过**；host `TypertRemoteService` 依赖 TS 装饰器 + typert 生成，属预览期契约、需重启验证。
- 权威模板（本项目 `_research/harness/deepseek-harness-master/` 官方源码）：
  - host：`packages/host/plugin-inventory/src/index.ts`（`class X extends TypertRemoteService` + `@Remote(name)` + `super(ctx,key)`）；
  - client：`packages/client/ui-goal/src/client/index.ts`（inject `remote` + `ctx.remote.goals.*` + `ctx.slots.inject`）。

## 安装与验证

```bash
# 本地安装（二选一）
dsh plugin --profile web add ./forge-plugin
dsh plugin --profile web add ./interview-forge-plugin-0.1.0.tgz   # 先 pnpm pack
# 验证
dsh --profile web --dump-config          # loader 合成含 interview-forge 行
node ~/.dsh/skills/dsh-plugin-development/scripts/check-artifact.mjs bundle ./forge-plugin
# 重启后：常规会话应可见 forge_* 工具；client 半边完成后可见 ⚡ 浮层
```

## 决策记录

- **不分发 GitHub**：`dsh plugin add` 底层是 pnpm，本地路径/tgz 即可私有使用。
- **DSH 为 preview**：接口可能破坏性变更；固定 `@deepseek-ai/dsh-tools@0.1.0-rc.7`。
- **跨端只能 `ctx.remote`**：官方合同如此；社区带 UI 插件均此路径。
- **数据优先落盘**：内存 Map 仅是会话浮层，权威在 `interview-forge-archive`。
