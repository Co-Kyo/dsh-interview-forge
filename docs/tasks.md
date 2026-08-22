# 任务与进度（roadmap / status）

> 同步入口：本文件的当前状态 + 工程 git 历史一起构成"执行度"基准。每完成一段即更新并 commit，避免偏离。

## 阶段与当前状态

| 阶段 | 内容 | 状态 | 证据/产出 |
| --- | --- | --- | --- |
| 0. 规范调研 | dsh-plugin-development skill + 官方源码，确认标准 host/client/cross 模型 | ✅ | `docs/architecture.md` |
| 1. 工程骨架 | forge-plugin + package.json(dsh.bundle.patch) + cordis.patch.yml + resources + README | ✅ | git 基线 |
| 2. host 半边 | 三工具 `ctx.tools.register(defineTool)` + 磁盘持久 | ✅ | `lib/index.js`；node --check |
| 3. 打包 | `pnpm pack` → 0.1.0.tgz（构建产物不入库） | ✅ | tgz（.gitignore 忽略） |
| 4. profile 挂载 | 正式 patch 写入 `~/.dsh/profiles/web/cordis.patch.yml` + 本地 link + 注入修复 | ✅ | 用户重启后探针验证 |
| 5. 运行时常驻 | 全局 tools 注册表含三 `forge_*`，随启动常驻 | ✅ | 探针 /tmp/hosttools*.json |
| 6. client 跨端 | host ForgeGateway(TypertRemoteService) + client(ctx.slots+ctx.remote.forge.*) | ⏳ 规划中 | 模板已锁定，源码待写 |
| 7. TS 构建 | tsc/tsdown + typert 生成 + client bundle roster 声明 | ⏳ | — |
| 8. 安装+重启验证 | 打 tgz → `dsh plugin add` → 用户重启 → ⚡浮层 + 答题闭环 | ⏳ | 需用户重启 |

## 已完成的验证记录（持久保存的证据）

1. **loader 集成**：`dsh --profile web --patch /tmp/forge-overlay.yml --dump-config` → `interview-forge` 行并入（exit 0），无 "Cannot find package"。真实 profile patch（无 --patch）同样通过。
2. **bundle preflight**：`~/.dsh/skills/dsh-plugin-development/scripts/check-artifact.mjs bundle ./forge-plugin` → `PASS, 0 warning`。
3. **运行时常驻（探针）**：注入宿主 tools 全局注册表 → `globalSchemas=[forge_start, forge_report_ready, forge_result]`、`get('forge_start')=true`、`get('read')=false`（普通工具属 preset 非全局）。
4. 会话可见性说明：`listTools` 返回本会话受限视图；全局工具注册表已证 host 已随启动注册；在无 restrict 的常规 preset 会话应可见。
5. **TS 装配 + 跨端 host 面模型编译通过**：`npm i typescript@5 @deepseek-ai/cordis`（registry 可达）；`tsconfig.json` + `src/host/forge-gateway.ts`（`ForgeGateway extends TypertRemoteService` + `@Remote`）→ `npx tsc --noEmit` **exit 0**（证明 host 跨端 TS+装饰器可本机编译，闸门打通）。

## 待办（下一棒）

- [ ] 写 `src/host/forge-gateway.ts`（`ForgeGateway extends TypertRemoteService`，方法 list/snapshot/load/applySeed/answer/nav/pause/resume/finish/report/history）
- [ ] 写 `src/client/index.ts`（inject `['slots','remote','remote.forge']` + `ctx.slots.inject('shell.overlay')` 渲染浮层 + `ctx.remote.forge.*`）
- [ ] 配置 TS 构建与 typert 声明生成；bundle 增加 client roster 行
- [ ] `pnpm pack` 新 tgz → `dsh plugin add ./...tgz` 本地安装
- [ ] 用户重启 `dsh web`，验证：⚡ 浮层出现、出题→答题→完成→报告闭环、历史数据可恢复

## 决策备忘

- 不分发 GitHub；本地 tgz 私有分发。
- 跨端必须 `ctx.remote`（官方合同），正式实现前先小 spike 验证 client roster + remote 挂载在本地 profile 可加载。

## v1 交付点（C 方案，本会话自主收口）
- **可交付 v1** = `interview-forge-plugin-0.1.0.tgz`（host bundle：三工具 + 磁盘持久 + 资源随包）+ `interview-forge` skill 引导的**对话内作答**闭环（出题→对话作答→归因→报告）。
- host 半边随 dsh 启动常驻（已探针验证）。浮层 client 为 DSH preview 缺少"外部 bundle 自带 browser roster"能力而**延后**（B/C 决策见 client-cross-end.md）。
- 安装：`dsh plugin --profile web add ./interview-forge-plugin-0.1.0.tgz`（或用 profile 现有本地 link + cordis.patch.yml 的 interview-forge 行）；重启 dsh 生效。
- 重启后验证：常规会话可见 `forge_*`；对 agent 说「开始练习」进入对话内速练闭环。

## ✅ 重大达成：浮层静态化全链路闭环（2026-08-20）
- **机制打通**：`dsh.client` 包声明（package.json + exports["./client"]）→ modules 收集 → `__DSH_BOOT__`
  → 浏览器加载 → `shell.overlay` slot 渲染。与社区 UI 插件同一机制。
- **host ForgeGateway**：`lib/forge-gateway.js`（TypertRemoteService 'forge'，10 个 @Remote），
  `lib/index.js apply` 中 `ctx.plugin(ForgeGateway)` 注册；esbuild 编译（装饰器语义 + typert-protocol
  external + node_modules symlink 保证 @Remote marker WeakMap 同实例）。
- **client remote.forge**：`src/client/forge-remote.ts` descriptors + apply 内 `await remote.$mount(...)`
  后经 `ctx.get('remote.forge')` 取用（**勿在 inject 声明 remote.forge** —— 自等死锁，见 6afeb0d 注释）。
- **host api-gateway SRC 回退**路由 `forge/<method>`，无需生成 ./typert 产物。
- 用户已确认：**右下角浮层正常显示**。
- 剩余：ForgeGateway 接入 store（list/snapshot/answer/finish 返回真实会话数据）+ 浮层答题交互接线。

## 待办（下一棒）
- [ ] ForgeGateway 方法接入 store（list 返回真实 entries；snapshot/load/answer/finish/report/history 操作 store/磁盘）
- [ ] 浮层 UI 补全：会话详情/答题视图（读题→提交 answer→完成 finish→报告 report）
## 🐛 修复：重启后浮层队列为空（2026-08-21）
- **症状**：dsh 重启后右下角 ⚡ 浮层面板空（list 返回 entries:[]），历史会话全部消失。
- **根因**：`diskEntries()` 的扫描根只来自 `store.lastArchiveDir/lastWorkspace`，两者仅在本进程内跑过
  `forge_start` 才有值 → 重启后 roots 为空直接返回 []；且 `load/snapshot/answer/finish` 只查内存，
  磁盘历史条目即使列出也无法打开。
- **修复**（`src/host/forge-gateway.ts`，工具契约零变更）：
  - `discoverRoots()`：多锚点收集候选根（store 字段 + 进程 cwd + **插件 import.meta.url 反推工作区** + 会话头 cwd 枚举）；
  - `hydrateEntry(sid)`（导出）：按 sid 内嵌日期定位 `sessions/{date}/quiz-{sid}.json`，重建完整条目
    （含 result/reportHtml/status），回填 `store.lastArchiveDir`；
  - `ensureEntry()`：load/snapshot/applySeed/answer/nav/pause/resume/finish/report 全部改走
    「内存命中 → 磁盘水合」；report 改为多根遍历。
- **验证**：`scripts/smoke-disk-recovery.mjs`（模拟重启后干净 store）→ 19 条历史全部发现；
  未完成场水合 status=answering；已报告场 reportHtml 16911 字符。生效需重启 dsh web。
## 🐛 E2E 驱动的三层修复：浮层队列空 + 答题视图崩溃（2026-08-21 续）
- **方法论升级**：引入真浏览器分层 E2E（`e2e-lab/`，playwright-core + 本机缓存 chromium，7+5 层 pass/fail 指标），
  告别「改→重启→肉眼猜」。每层可独立判定：boot 清单 → 模块执行诊断点 → FAB → 页面内 RPC → 面板 → 队列 → 答题视图。
- **第一层（client 信封不解包）**：抓包证明 wire 层 ok:true+19 条完整返回，但 SDK resolve 的是整个
  `{ok,value}` 信封 → `d.entries` 永远 undefined → 队列恒「暂无练习」。修复：`unwrapEnvelope`
  （{ok,value}→value；ok:false 转 reject 让面板能显示错误）。
- **第二层（descriptor 缺 6 个）**：host 声明 10 个 @Remote，client contribution 只有 4 个
  （缺 load/applySeed/nav/pause/resume/report）→ 点开作答中会话时 `applySeed is not a function`
  → **slot 树整体崩溃卸载（即「答题选项出不来」的直接根因）**。补齐 6 个 descriptor。
- **第三层（Proxy 防御）**：解包 Proxy 对 symbol/非函数属性也返回包装函数，React 内部探测即崩。
  改为仅真方法包装、其余透传。
- **附带修复**：hydrateEntry 并发竞态（applySeed/load/snapshot 同时触发水合 → order 重复 push → 队列重复行）
  插入前同步重查 + list() 按 sid 去重兜底。
- **诊断基建**：client 内置 `window.__FORGE_DIAG__`（apply 各步骤 + list 原始返回值 + FAB 计数徽标），
  现场排查只需刷新后读一个全局变量。
- **验证**：`overlay.e2e.mjs` 7/7、`quiz.e2e.mjs` 5/5（题干/4 选项/理由框/进度头/截图）。
  override.js 报错证实为浏览器扩展噪音（干净浏览器 0 出现；服务端无此文件）。

## 🚀 方案 B：GitHub 发布对接 + 包改名（2026-08-22）

- **定名**：调研 DSH 插件生态命名（awesome 列表 / `#dsh` topic），主流为 `dsh-<功能名>`；
  官方 publish.md 示例包名即 `dsh-hello-plugin`。定名 **`dsh-interview-forge`**，npm 包名同步改（版本升 0.2.0）。
- **改名落点**：package.json / cordis.patch.yml 两行 / src/client/forge-remote.ts 33 处
  （descriptor id/typeSymbol 前缀）/ README 重写 / LICENSE 新增（MIT, Co-Kyo）。
- **依赖重构（发布正确性关键）**：`@deepseek-ai/dsh-tools|dsh-typert-protocol` 从 dependencies 改 **peerDependencies**。
  依据宿主源码 `packages/boot/app-boot/src/profile.ts`：模块两锚点解析 + `$DSH_HOME/profiles/node_modules`
  平铺回退目录把安装闭包 symlink 给 profile —— peer 不装副本，parent-walk 命中宿主同实例（WeakMap 标记一致，
  forge/* RPC 才通）；声明 dependencies 会在用户机器被 pnpm 装出第二实例遮蔽回退 → 必现 404。
  zod 仅 client bundle 内联使用，移出运行时依赖。
- **CI**：新增 `.github/workflows/release.yml` —— push tag `v*` → 校验 tag=package 版本 → npm ci →
  build 双半区 → npm pack → tgz 挂 GitHub Release（softprops/action-gh-release）。用户免构建许可。
- **产物**：`dsh-interview-forge-0.2.0.tgz`（lib×3 + resources + patch + README + LICENSE，无 node_modules/secrets）；
  官方预检 PASS(0 warning)；删除过期旧包 interview-forge-plugin-0.1.0.tgz（落后 24 commits）。
- **本机接线**：`~/.dsh/profiles/node_modules/interview-forge-plugin` symlink 改名为 `dsh-interview-forge`；
  `~/.dsh/profiles/web/cordis.patch.yml` 行引用同步。`dsh --profile web --dump-config` 验证
  `- id: interview-forge / name: dsh-interview-forge` 并入无解析错误。**生效需重启 dsh web**。
- **待办（需用户 GitHub 账号操作）**：
  - [ ] GitHub 建仓 `dsh-interview-forge`（建议 Public + MIT 已备）
  - [ ] `git remote add origin git@github.com:<owner>/dsh-interview-forge.git && git push -u origin main`
  - [ ] 打 topics：`dsh`、`dsh-plugin`（生态发现用）
  - [ ] push tag `v0.2.0` 触发首发 Release
  - [ ] （可选）向 awesome-deepseek-harness / awesome-dsh-plugin 提 PR 收录，标注 `#bundle`
- 备注：e2e-lab 内 api-remotes.client.js / modules 快照仍含旧名，属实验室本地快照，下次跑 E2E 时再生即可。

## 🎯 v0.3.0：配套 skill 随包分发（2026-08-22 续）

- **问题**：skill 存在三份已漂移拷贝（~/.dsh/skills 手工版 / interview-forge-skill 仓库 / 插件 resources），
  且手工版 SKILL.md 的「动态插件自举」流程在静态 bundle 时代已过时。
- **官方机制**（源码证据）：`packages/skill/skill-badge` = 插件自带 skill 的标准形状——
  `inject=['skills']` + `ctx.skills.registerProvider(...)`，resourceBase 指向包内目录；
  layered-skill-registry 笔记确认 repository plugin 的 provider 落全局层、对所有挂 tool-skill 的会话可见。
- **实现**：
  - `resources/` 整体迁入 `skill/`（references + schemas + scripts/render-report.cjs(+e2e)），git mv 保历史；
    md5 确认迁移前 render-report.cjs 两份一致，resources 为最新代真源
  - 新 SKILL.md：删自举步骤 → 改为「forge_* 工具就绪检查 + 安装指引」；渲染脚本路径改 scripts/；
    运维段适配静态 bundle
  - `lib/index.js`：inject 增 `skills`；按 badge 模式注册 provider（candidate name=interview-forge、
    rank=BUNDLED_SKILL_RANK(600)、source=bundled）；ctx.skills 缺失时降级不阻塞工具
  - package.json：files resources→skill；peerDependencies 增 `@deepseek-ai/dsh-skill`
- **验证**：假 ctx 冒烟全绿（provider list/get、resourceBase、SKILL.md 内容无自举残留）；
  预检 PASS(0 warning)；dump-config 行并入正常；v0.3.0.tgz 含 skill/ 全量
- **退役**：`~/.dsh/skills/interview-forge` 手工副本移出至 `_retired/manual-skill-backup-20260822`
  （就近层优先规则会遮蔽随包版，必须移除；系统 skill 目录已实时确认消失）；
  `interview-forge-skill/` 工作区仓库标记 deprecated 指向本仓。
