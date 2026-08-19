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
