# DSH 插件开发 · 常见错误与修复（从 git 历史抽离）

> 来源：forge-plugin 工程真实踩坑记录（commit 信息）。每节 = 一次真实修复。
> 适用：开发标准 DSH 宿主插件（host 半边 Node + client 半边浏览器浮层 + cross-end Remote）。
> 阅读顺序：先看「快速索引」，再按需进明细。

## 快速索引

| # | 报错（关键字） | 阶段 | 修复 commit |
| --- | --- | --- | --- |
| 1 | `Failed to load plugins` / `invalid plugin ... received undefined` | web 引导页 | `9595459` |
| 2 | `pending (waiting for service: remote.forge)` | web boot | `6afeb0d`（引入者 `9a1e09a`） |
| 3 | `cannot get property "remote.forge" without inject` | web boot / apply | `c7cfe18` |
| 4 | `require.resolve('<pkg>/package.json')` 失败并被缓存为负 | modules resolve | `e167768` |
| 5 | `@Remote` marker 读不到 → forge/* 路由不到（`invocation-unavailable`） | host cross-end | `6afeb0d`（前置约束） |
| 6 | esbuild `Invalid option ... "intro"` | 构建 | 见 #1 / 本文末尾 |

---

## 1. `Failed to load plugins` / `invalid plugin, ... received undefined`

**症状**
- `dsh web` 启动无错（host 半边正常），但浏览器打开 web 端停在「Failed to load plugins」。
- loader 报：`failed to apply loader entry <hexid> (<pkg>): invalid plugin, expect function or object with an "apply" method, received undefined`（`<hexid>` 是 loader 给无 id 入口自动生成的 8 位 hex，`ensureId` 产物）。

**根因**
- DSH web 壳的 `ClientModuleSystem.materialize` 把 **factory 的返回值当作模块导出**，loader 再把它当插件对象。
- client bundle 用 `format: 'iife'` 打包，`window.__ModuleLoader__.load({ id, factory })` 的 factory 函数体只是一个 `(() => {...})()`，
  **没有 return** → factory 返回 `undefined` → `registry.plugin(undefined)` 抛「invalid plugin」。
- host 半边 `lib/index.js` 是标准 ESM 插件（`export { name, inject, apply }`），正常加载 —— 所以启动无错。

**修复**（对齐官方 `packages/client/tsdown.client.ts` 的 `clientConfig`）
```js
// scripts/build-client.mjs —— 不要用 iife；必须 cjs + module/exports 垫片 + 显式 return
format: 'cjs',
banner: `window.__ModuleLoader__.load({\n  id: ${pkg.name},\n  factory: (require) => {\nvar module = { exports: {} }; var exports = module.exports;`,
footer: `\nreturn module.exports; } });`,
// 注：esbuild 没有 intro 选项（那是 rolldown/tsdown 的），垫片并入 banner 即可（见 #6）
```

**验证**：在 Node 里模拟 materialize（`vm` 加载 bundle → 截获 `window.__ModuleLoader__.load` 的 handoff → 调 `handoff.factory(require)`），确认返回值是 `{ apply, inject }` 而非 `undefined`。

---

## 2. `web boot: 1 entry did not activate <pkg>: pending (waiting for service: remote.forge)`

**症状**：boot 时某个 client 入口一直 PENDING，报「waiting for service: remote.forge」，web 端进不去。

**根因（典型的自等死锁）**
- `remote.<namespace>` 服务由**这个插件自己**的 `ctx.remote.$mount(Contribution)` 安装（api-gateway client 的 `RemoteNamespaceService`）。
- cordis 的 **inject 解析发生在 `apply` 之前**：在 `inject` 里声明 `'remote.forge'`，而它是本插件 apply 里才安装的 → 永远等不到 → PENDING。

**修复**
- `inject` 只声明**先于本插件已存在**的服务（`['slots', 'remote']`）；
- 在 `apply` 里 `await remote.$mount(ForgeRemoteContribution)` **之后**再取用。

> ⚠️ 注意区分：#2 PENDING（inject 声明了自己后置的服务）与 #3 门禁（嵌套属性访问）是**两种不同症状**，处理相反。

---

## 3. `cannot get property "remote.forge" without inject`

**症状**：web boot 报 `failed to apply loader entry <hexid> (<pkg>): cannot get property "remote.forge" without inject`。

**根因**
- 用 `(ctx.get('remote')).forge` 这种**嵌套属性访问**取命名空间。
- cordis 把服务对象包进 traceable 代理，访问未在 inject 声明的嵌套属性会走上下文解析 → **注入门禁**，
  **即使 `remote.forge` 已注册成功也被拦下**（这是与 #2 相反方向的坑）。
- 官方 `ctx.remote.goals.*` 能这么写，是因为官方包把 `remote.goals` 声明进了 inject、且由**另一插件先提供**。

**修复**：改用**点分键**直接读服务注册表
```ts
const forgeRpc = ctx.get('remote.forge') as unknown as ForgeRpc   // ✅
// const forgeRpc = (ctx.get('remote') as any).forge               // ❌ 触发门禁
```

**实证**（真实 cordis 同版本最小复刻，服务已注册后仍复现）：
```
nested (get(remote)).forge   -> cannot get property "remote.forge" without inject
dotted  get(remote.forge)    -> true | list is function
```

---

## 4. `exports` 字段封锁 → 子路径 require.resolve 失败并被缓存为负

**症状**：`modules` 对包做的 resolve 判定全红（`resolvePkgJson / dsh.client / exports[./client] / client.js 存在` 四个判定不逐个通过）。

**根因**：`package.json#exports` 字段把子路径**封锁**了 —— 没列出的子路径解析器拒绝解析；
`require.resolve('<pkg>/package.json')` 失败且**被缓存为负**，后续判定跟着全挂。

**修复**：把解析器会用到的子路径都显式列进 `exports`（`./client`、`./package.json` 等）：
```json
"exports": {
  ".": "./lib/index.js",
  "./client": { "default": "./lib/client.js" },
  "./package.json": "./package.json"
}
```

---

## 5. host `@Remote` marker 读不到 → 跨端路由不到（SRC 回退找不到端点）

**症状（前置约束，踩坑即必现）**：client `remote.forge.list()` 到 host `/api` 后报
`invocation-unavailable` / `no active Remote method exports this endpoint`，
或 `remoteMethods(service)` 返回空数组。

**根因**：`@Remote` 装饰器把方法标记写进 `@deepseek-ai/dsh-typert-protocol` **模块实例的私有 WeakMap**（按 prototype 键）；
host api-gateway 用 `remoteMethods()` 从**同一个**实例读。若你的插件把 protocol **内联打包或装了第二个实例** → 两个模块实例、
WeakMap 不共享 → 读不到 marker。host 的 SRC 回退（无生成 `./typert` 产物时扫描活跃服务）就完全失效。

**修复**
1. host 半边构建时把 protocol 保持 **external 裸导入**（不 inline）：
   ```js
   // scripts/build-host.mjs
   external: ['@deepseek-ai/dsh-typert-protocol']
   ```
2. 插件本地 `node_modules` 下对 protocol 建 **symlink 到 host 同一物理路径**，保证运行时只有一个实例：
   ```bash
   ln -sfn <host的dsh-typert-protocol真实路径> \
     node_modules/@deepseek-ai/dsh-typert-protocol
   ```

**验证**：host 模拟 Context 里 `remoteMethods(ctx.get(serviceKey))` 应能列出所有 `@Remote` 方法；
`service.typertRemote` 应为 `{ service, serviceKey, namespace }`（namespace = client `$mount` 的 wire namespace）。

---

## 6. 构建期小坑（附）

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| esbuild `Invalid option in build() call: "intro"` | `intro` 是 rolldown/tsdown 选项，非 esbuild | 把 `var module = { exports: {} }; var exports = module.exports;` 并入 `banner` |
| esbuild 对标准装饰器（`@Remote`）产出 | 需浏览器运行 `context.addInitializer` 语义 | esbuild ≥0.21 原生支持标准装饰器，直接构建即可（已验证 `__decoratorContext(... addInitializer ...)`） |
| client bundle 体积猛增（3.6KB → 536KB） | 描述子用 `zod`，`noExternal` 默认内联 | 属预期，zod 仅 client 端编解码用 |

---

## 排查思路速查

- 报错在 **引导页 + 启动无错** → 一定在 client 加载/apply 层（#1/#3）。
- 报错为 **PENDING + waiting for service** → inject 声明与提供服务时序错位（#2）。
- 报错为 **cannot get property ... without inject** → 嵌套属性访问需要改用点分键（#3）。
- host 侧工具启动正常但 RPC 不达 → 检查 protocol 单实例（#5）与 `exports` 子路径（#4）。
