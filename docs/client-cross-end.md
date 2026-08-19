# client 半边（跨端）实现设计 — 权威事实与步骤

> 目标：为 EnglishForge/InterviewForge 提供浏览器速练浮层（⚡FAB/答题/报告/历史），作为完整静态方案的一部分。
> 本文件只记录已从**官方源码**确认的权威事实与实现步骤；每步照做并更新 docs/tasks.md。

## 断言：跨端必须走官方路径，无法纯 JS 绕过（preview 契约）

- client 调用宿主数据 = `ctx.remote.<service>.<method>()`（官方先例：`packages/client/ui-goal/src/client/index.ts` 用 `ctx.remote.goals.*`）。
- host 提供服务 = `class X extends TypertRemoteService` + 方法 `@Remote('name')` + `super(ctx, key)`（官方先例：`packages/host/plugin-inventory/src/index.ts`）。
- 对应声明由 **typert 生成器**从 TS 面模型生成（`packages/typert/generator`），client 注入 `remote.<service>`。

### host 半边（本已达到）
工具：`ctx.tools.register(defineTool)` × 3（`forge_start`/`forge_report_ready`/`forge_result`），随启动常驻、全局注册表已证。
待加：`ForgeGateway extends TypertRemoteService` 承载实时方法：
`list / snapshot / load / applySeed / answer / nav / pause / resume / finish / report / history`。

### client 半边（bundle 携带浏览器 UI 的官方机制）
- 官方 browser roster：`packages/bundle/web-app/cordis.patch.yml` 里 `dsh.client` 行（如 `ui-theme`、`ui-conversation`）→ 被 `dsh-client-modules` 扫描进 `window.__DSH_BOOT__`，经 `/plugins/<id>/client.js` 提供浏览器产物。
- 自建 client 插件须：① 构建出 client bundle（被 modules 收集）；② 在 profile 的 browser roster 注入一行（外部 bundle 通过 patch 往 roster insert）。
- 注册 UI：`ctx.slots.inject('<slot>', () => ctx.slots.register({...}))`；本方案挂 `shell.overlay`（动态版已在用；静态版需在官方 slot 树复核该名）。
- inject：`['slots','remote','remote.forge', …]`。

## 工程落地步骤（Installable bundle + TS）

1. `forge-plugin` 增 `tsconfig`（extends 官方 `tsconfig.base`）+ `tsdown` 构建（参考 `packages/client/ui-goal/tsdown.config.ts` 双入口 host/client）。
2. `src/host/forge-gateway.ts`：`ForgeGateway extends TypertRemoteService`（`super(ctx,'forge')`）+ `@Remote` 方法列表；复用 `lib/index.js` 的 store/持久/扫描逻辑（抽成 shared 模块）。
3. `src/client/index.ts`：`inject ['slots','remote','remote.forge', self]` + `ctx.slots.inject('shell.overlay')` 渲染 ⚡ 浮层（复用原动态版 React 组件）+ `ctx.remote.forge.*` 读写。
4. typert：运行官方 `packages/typert/generator` 生成 `remote.forge` 声明（host 与 client contribution）；client 注入 `remote.forge`。
5. bundle patch 增加：host 行（带 ForgeGateway）+ browser roster 行（client）。
6. `pnpm pack` → 新 tgz → `dsh plugin add ./…tgz` 本地安装。
7. 用户重启 `dsh web` → 验证 ⚡ 浮层 + 答题闭环 + 历史恢复；更新 docs/tasks.md 并 commit。

## 门槛与验证依赖（预览期，须向用户明示）
- DSH preview：`TypertRemoteService`/typert/roster 契约可能破坏性变更；固定版本。
- **无法在本机自证 client 跨端**：浏览器加载 + 重启 web 必须由用户执行；我能提供的证据 = 官方模板对照 + 构建产物 + `dump-config` loader 合成 + (若可行) 最小 spike。
- 构建依赖：需在 forge-plugin 装 `@deepseek-ai/dsh-typert-protocol`、`zod`、tsdown/tsc 等（npm，需用户环境网络或本地已有）。

## 已确认：client roster 集成的结构性缺口（决策点，勿越步）
- 官方 browser roster 是 `packages/bundle/web-app/cordis.patch.yml` 内**一个具体 `- insert:` 块**（`dsh.client` 行），由 `dsh-client-modules` 扫进 `window.__DSH_BOOT__`。
- **外部 bundle 的 `cordis.patch.yml` 是另一 patch 层/另一 insert，并列而非追加** → 自己 bundle 里写 `role: client` 并不会进入 web-app roster，client 浮层不会被 modules 收集、浏览器不可见。
- 可行路径（下一步需选定）：
  - A：在 **profile/`--patch` 覆盖层**向 web-app 的 roster insert 追加 forge 的 `dsh.client` 行 —— ❌ **已证伪**：
    当前 loader patch 定位基于 **行 id**（覆盖/disable/insert），而 browser roster 是无 id 的 `insert:` 块，
    无法"按 id 追加"进该匿名块；外部 bundle 与 profile 覆盖层都插不进。
  - A'：**改官方 `@deepseek-ai/dsh-web-app` bundle 的 roster** —— 预览期升级即被覆盖，不可持续，不推荐。
  - B：**等 DSH 提供"外部 bundle 自带 client roster"能力**（当前 preview 无）。
  - C：将 "host bundle + 对话内作答" 作为可交付 v1，浮层待上述机制成熟后再上 —— 当前最稳可交付。

> 注：用户曾选 A；经核实其 patch 语义前提（按 id 追加 insert 块）不成立，故 A 运行时不可达，A' 可持续性差，C 为现实交付。浮层跨端若要继续，现实路径为 B（等官方）或改造官方 bundle（A'，不推荐）。

## 决策
- 跨端坚持官方 `ctx.remote` 路径（社区带 UI 插件均此）。
- 若预览期此契约被判定过重，fallback：先将 "host bundle + 对话内作答" 打包为可交付 v1（不零散、随启动、数据持久），浮层作为 v2。
