# InterviewForge 知识生命周期模型

> 本文件供 Agent 在出题阶段（Step 1~2）读取，确保题目带有版本意识。
> 设计原则：不靠主观判断，靠客观锚定（官方声明 + 替代关系 + 领域上下文）。

---

## 1. 四维模型

每个知识点从四个独立维度描述其生命周期状态：

### 维度1：stage（生命周期阶段）

| 值 | 定义 | 客观锚定 |
|----|------|---------|
| `experimental` | 尚未稳定，API 可能变更 | RFC / alpha / Canary 独占 |
| `adopted` | 已发布稳定版，但非默认选择 | 稳定版可用，社区实践仍在过渡 |
| `dominant` | 当前行业标准做法 | 官方推荐 + 社区主流 + 教程默认 |
| `declining` | 有明确 successor，官方已表态替代方向 | 官方文档标注"考虑用 X 替代" |
| `deprecated` | 官方已标记废弃 | 官方文档标注"已废弃" / 下一大版本将移除 |

**注意**：stage 不是时间标签，是状态标签。同一技术在不同领域可以处于不同 stage（见维度3）。

### 维度2：successor（替代关系）

```yaml
successor: string | null
```

- 如果存在明确的现代替代方案，填写替代方案的名称
- 如果没有明确替代（如核心语言特性），填写 null
- 例：`Render Props → successor: "Custom Hooks"`
- 例：`HOC → successor: "Custom Hooks / Render Props"`

### 维度3：domainRelevance（领域相关性）

```yaml
domainRelevance:
  - domain: "领域名称"
    stage: "该领域内的生命周期阶段"
```

解决"同一技术在不同领域处于不同阶段"的问题。

**前端领域示例**：
```yaml
domainRelevance:
  - domain: "frontend-SPA"
    stage: "dominant"
```

如果技术只在特定领域有不同定位，才需要 domainRelevance。大多数情况下一个 stage 就够了。

### 维度4：interviewSignal（面试信号映射）

| 条件 | 面试回答策略 | 出题要求 |
|------|------------|---------|
| `dominant` | 直接回答，无需加版本声明 | 正常出题 |
| `adopted` | 提及"这是较新的实践"，展示跟进能力 | 可选加"与传统方案的区别"追问 |
| `declining` | **必须声明**"我知道这是旧方案，现在用 X 替代"——展示版本意识 | **必须带版本上下文出题**，追加"现在用什么替代" |
| `experimental` | 加分项，"我关注到 X 正在探索..." | 仅作追问级题目，不占主体 |
| `deprecated` | 风险项，"这个已经不推荐了，原因是..." | 不应作为主考题，最多出辨析题 |

---

## 3. 出题时的强制规则

### 规则1：declining/deprecated 知识点必须带版本上下文

**错误出题**：
> "什么是 Render Props？"

**正确出题**：
> "什么是 Render Props？它解决了什么问题？现在通常用什么替代它？"

**原因**：不带版本上下文的 declining 题目，会导致用户只回答模式名称而忽略演进关系，面试中暴露版本意识缺失。

### 规则2：题目 JSON 必须标注 lifecycle

每道题**必须**包含 `lifecycle` 字段（格式见 quiz-format.md 2.1 节）。
declining/deprecated 的完整示例：`{ "stage": "declining", "successor": "Custom Hooks", "interviewSignal": "必须声明替代关系" }`

### 规则3：dominant 简化写法

stage 为 dominant 且 successor 为 null 时：`"lifecycle": { "stage": "dominant" }`（详见 quiz-format.md）

---

## 4. 常见技术栈的 Lifecycle 预设

### React

| 知识点 | stage | successor | interviewSignal |
|--------|-------|-----------|----------------|
| JSX 本质 | dominant | null | 直接回答 |
| Hooks 调用顺序 | dominant | null | 直接回答 |
| useEffect 时序 | dominant | null | 直接回答 |
| 受控组件 | dominant | null | 直接回答 |
| Reconciliation 核心假设 | dominant | null | 直接回答 |
| children + 组合模式 | dominant | null | 直接回答 |
| **Render Props** | **declining** | **Custom Hooks** | **必须声明替代关系** |
| **HOC（高阶组件）** | **declining** | **Custom Hooks** | **必须声明替代关系** |
| **Class 组件生命周期** | **declining** | **useEffect** | **必须声明替代关系** |
| **React.mixin** | **deprecated** | **Hooks / 组合** | **不应作为主考题** |
| React Server Components | adopted | null | 提及"较新实践" |
| Server Actions | experimental | null | 加分项 |

### Vue

| 知识点 | stage | successor | interviewSignal |
|--------|-------|-----------|----------------|
| Composition API | dominant | null | 直接回答 |
| reactive / ref | dominant | null | 直接回答 |
| **Options API** | **declining** | **Composition API** | **必须声明替代关系** |
| **Vue.mixin** | **deprecated** | **Composables** | **不应作为主考题** |
| **Vue2 EventBus** | **deprecated** | **provide/inject / Pinia** | **不应作为主考题** |
| Vue Vapor Mode | experimental | null | 加分项 |

---

## 5. 版本记录

- v1.1 (2026-04-22)：精简冗余（去动机说明、去跨阶段规则重复、去与 quiz-format.md 重复的示例），170行→120行
