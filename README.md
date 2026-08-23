# dsh-interview-forge

InterviewForge 速练 —— DeepSeek Harness 的快速练习插件：**出题 → ⚡浮层答题 → 归因分析 → 雷达报告**，随 `dsh` 启动常驻，进程重启数据不丢。

| | |
|---|---|
| 当前版本 | ![v0.3.3](https://img.shields.io/badge/version-0.3.3-blue) |
| 适用环境 | DSH web profile（`@deepseek-ai/dsh-* >= 0.1.1-rc.1`） |
| 组成 | host 工具 + 浏览器浮层 UI + 配套 skill（一个包全带） |
| License | MIT |

## 它能做什么

- **快速出题**：对 agent 说「开始练习」「练一组」，按目标拆解生成 5~12 道题
- **对话内答题**：Web 右下角 ⚡ 浮层弹出队列，点开即答；计时器制造节奏压力，选择题需填写选择理由
- **反馈报告**：完成后自动触发归因（认知标签 / 交叉检验 / 叙事风险），渲染雷达报告，浮层内直接查看
- **历史回溯**：月历看板按日期浏览全部练习；明暗主题跟随系统

## 安装

```sh
# 推荐：Release tarball（预构建，无需构建许可）
# 从 https://github.com/Co-Kyo/dsh-interview-forge/releases 下载 tgz 后：
dsh plugin --profile web add ./dsh-interview-forge-0.3.3.tgz

# 或者：Git 直装（pnpm 会执行 prepare 构建）
dsh plugin --profile web add github:Co-Kyo/dsh-interview-forge#main
```

> Git 直装首次会被 pnpm ≥10 拦下要求允许构建：把 pnpm 打印的包名写进 profile 目录
> `pnpm-workspace.yaml` 的 `allowBuilds` 后重跑即可。

装完**重启 `dsh web`**，随启动自动加载。

## 使用

1. 对 agent 说「**开始练习**」（可附话题，如「练一组 Vue 响应式」）
2. 点击右下角 **⚡ 浮层**，打开队列中的练习开始答题；最小化即暂停计时
3. 点「**完成练习**」，会话自动跳回并发送「答完了」，agent 生成雷达报告后在浮层查看

配套 skill（`interview-forge`）随包提供，无需单独安装——它指导 agent 完成出题规范与归因流程。

## 数据在哪

```
{工作区}/interview-forge-archive/sessions/{YYYY-MM-DD}/
  quiz-{sid}.json        # 题库
  result-{sid}.json      # 答题记录
  attribution-{sid}.json # 归因结果
  report-{sid}.html      # 雷达报告
```

所有状态落盘。重启后工具与浮层都能从磁盘懒水合历史；删除档案文件即时生效（队列自愈出列）。

## 升级与卸载

```sh
dsh plugin --profile web add ./dsh-interview-forge-<新版本>.tgz   # 升级 = 重装
dsh plugin --profile web remove dsh-interview-forge              # 卸载（skill 随之消失）
```

> 从旧版升级：若曾手工把 skill 装在 `~/.dsh/skills/interview-forge`，请删掉该目录，
> 否则会遮蔽随包版本（skill 自 v0.3.0 起由插件 provider 提供）。

---

# 开发者指南

## 工程结构

```
dsh-interview-forge/
├── package.json          # dsh.bundle.patch + dsh.client 声明；@deepseek-ai/* 全部 peerDependencies
├── cordis.patch.yml      # 两行挂载：interview-forge(host) / interview-forge-client(client)
├── lib/                  # 构建产物（入库）：index.js 手写源码 + gateway/client esbuild 产物
├── src/host/             # ForgeGateway TS 源码（装饰器语义）
├── src/client/           # 浮层 UI TS 源码（shell.overlay slot + remote.forge descriptors）
├── scripts/build-*.mjs   # esbuild：host 用 ESM+external 协议包；client 产出 __ModuleLoader__ CJS 形状
├── skill/                # ★ 配套 skill 唯一真源（SKILL.md + references + schemas + render-report.cjs）
└── docs/                 # architecture / client-cross-end / troubleshooting / tasks
```

## 实现红线（改代码前必读）

1. **协议包必须 peer**：typert 的 `@Remote` 标记存于模块私有 WeakMap，插件与宿主解析到两个物理实例 = `forge/*` RPC 全部 404。声明成 `dependencies` 会被 pnpm 装出第二实例遮蔽宿主回退目录，绝对不行。
2. **client 禁止 inject `remote.forge`**：自等死锁。声明 `['slots','remote']`，apply 内 `$mount(...)` 之后用点分键取用。
3. **RPC 返回值必须解包**：SDK resolve 的是 `{ok,value}` 信封；包装 Proxy 只包真方法，否则 React 内部探测崩溃。

更多历史坑见 [docs/troubleshooting.md](docs/troubleshooting.md)，架构决策见 [docs/architecture.md](docs/architecture.md)。

## 本地开发

```sh
git clone https://github.com/Co-Kyo/dsh-interview-forge.git && cd dsh-interview-forge
npm install            # devDependencies（esbuild/typescript 等）；@deepseek-ai/* 由 peer 解析到宿主
npm run build          # build:host + build:client
dsh plugin --profile web add .    # 本地目录直装联调，重启 dsh web 生效
node scripts/smoke-disk-recovery.mjs   # 磁盘恢复冒烟（模拟干净 store）
```

## 发布

```sh
# 1. package.json 改版本号（CI 会校验 tag 与之一致）
# 2. 提交并打 tag：
git commit -am "release: v0.x.y" && git tag v0.x.y && git push origin main --tags
# 3. CI 自动：构建双半区 → npm pack → tgz 挂 GitHub Release
```

## 已知限制

- DSH 处于开发者预览，宿主接口可能有破坏性变更（peer 下限 `0.1.1-rc.1` 对齐当前宿主实例）
- e2e-lab 为实验室本地设施，未随包分发

## License

[MIT](LICENSE) © Co-Kyo
