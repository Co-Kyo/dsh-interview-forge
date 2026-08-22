# dsh-interview-forge

InterviewForge 速练 —— 标准 DSH 宿主插件 bundle：出题 → ⚡浮层答题 → 交叉检验归因 → 雷达报告，随 `dsh` 启动加载、进程重启不丢。

- **host 半区**：注册三个模型工具（`forge_start` / `forge_result` / `forge_report_ready`）+ `ForgeGateway`（TypertRemoteService，10 个 `@Remote` 方法），磁盘持久档案
- **client 半区**：浏览器 ⚡ 速练浮层（队列 / 答题视图 / 报告模态框 / 历史日历 / 明暗主题），经 `ctx.remote.forge.*` 调用 host
- **资源随包**：quiz/attribution schema、归因规范 references、`render-report.cjs`

## 安装

```sh
# 方式 A：Release tarball（预构建，推荐——无需构建许可）
#   从 GitHub Releases 下载 dsh-interview-forge-<ver>.tgz 后：
dsh plugin --profile web add ./dsh-interview-forge-0.2.0.tgz

# 方式 B：Git 直装（源码形式，pnpm 会执行 prepare 构建）
dsh plugin --profile web add github:<owner>/dsh-interview-forge#main
#   pnpm ≥10 首次会要求允许构建：把 pnpm 打印的包名写进 profile 的
#   pnpm-workspace.yaml → allowBuilds: { "dsh-interview-forge": true } 后重试

# 方式 C：本地目录（开发联调）
dsh plugin --profile web add ./forge-plugin
```

装完重启 `dsh web` 即随启动加载。对 agent 说「开始练习」即可进入闭环。

## 工程结构

```
dsh-interview-forge/
  package.json          # dsh.bundle.patch + dsh.client 声明；@deepseek-ai/* 走 peerDependencies
  cordis.patch.yml      # 两行插件挂载：interview-forge(host) / interview-forge-client(client)
  lib/index.js          # host 入口：apply(ctx)，三工具 ctx.tools.register(defineTool) + ForgeGateway 注册
  lib/forge-gateway.js  # esbuild 产物：TypertRemoteService 'forge'，SRC 回退路由 forge/<method>
  src/host/             # gateway TS 源码（装饰器语义，typert-protocol 必须 external 保持同实例）
  src/client/           # 浮层 UI TS 源码（slots 注入 shell.overlay + remote.forge descriptors）
  scripts/build-*.mjs   # esbuild 构建脚本（host: ESM external 协议包；client: CJS __ModuleLoader__ 形状）
  resources/            # schemas、references、render-report.cjs(+e2e)
```

## 关键实现约定（改代码前必读）

1. **依赖必须 peer**：`@deepseek-ai/dsh-typert-protocol` 的 `@Remote` 标记存于模块私有 WeakMap，
   插件与宿主若解析到两个物理实例，`forge/*` RPC 直接 404。DSH 通过 `$DSH_HOME/profiles/node_modules`
   平铺回退目录把安装闭包 symlink 给所有 profile —— 声明成 `dependencies` 反而会被 pnpm 装出第二实例遮蔽回退。
2. **client 勿在 inject 里声明 `remote.forge`**：自等死锁。声明 `['slots','remote']`，apply 内
   `$mount(...)` 之后用点分键 `ctx.get('remote.forge')` 取用。
3. **信封解包**：SDK resolve 的是 `{ok,value}` 信封，取值前必须 unwrap，且只包装真方法（Proxy 防御）。
4. 详见 `docs/troubleshooting.md`（6 类历史坑）与 `docs/architecture.md`。

## 数据路径（重启不丢）

```
{workspace}/interview-forge-archive/sessions/{YYYY-MM-DD}/
  quiz-{sid}.json / result-{sid}.json / attribution-{sid}.json / report-{sid}.html / seed-{sid}.json
```

重启后 host 会多锚点发现档案根并懒水合历史条目；磁盘清理即时生效（list/history 自愈出列）。

## 发布流程

push tag `v*` → GitHub Actions 自动构建双半区 → `npm pack` → tgz 自动挂到 Release。
版本号在 `package.json` 手工维护，tag 与之同步（如 `v0.2.0`）。

## 注意

- DSH 处于开发者预览，接口可能有破坏性变更；peer 范围 `>=0.1.1-rc.1` 对齐当前宿主实例。
- MIT License。
