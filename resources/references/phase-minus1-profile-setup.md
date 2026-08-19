# Phase -1: Profile Setup — 用户知识追踪档案初始化

## 触发条件

以下任一情况触发档案初始化流程：

1. **首次使用 InterviewForge**，尚未配置档案路径
2. 用户主动说："建档案" / "创建档案" / "建立学习档案" / "知识追踪" / "我要建档"
3. 用户明确说："换一个档案路径"

## 执行流程

### Step 1：询问档案路径（必须指定）

向用户提问，**必须获取有效路径，不设默认值**：

```
请告诉我你的知识追踪档案放在哪个路径？

（例如：D:\Knowledge-Archive、~/Documents/学习档案）
```

#### 路径处理规则

- 用户**必须提供**有效路径，不接受空输入
- 路径不存在时，询问是否创建：
  ```
  路径 {path} 不存在，是否创建？（回车确认 / 输入新路径）
  ```
- 路径存在但不可写时，提示用户重新指定
- 路径中存在已初始化的档案（检测到 `config.json` + `.git/`）时，直接复用，不再初始化

### Step 2：初始化目录结构

通过 PowerShell 执行以下操作：

```powershell
$ArchivePath = "{用户指定的路径}"

# === 1. 目录结构 ===
New-Item -ItemType Directory -Force -Path "$ArchivePath\profiles"
New-Item -ItemType Directory -Force -Path "$ArchivePath\sessions"
New-Item -ItemType Directory -Force -Path "$ArchivePath\tracking"
New-Item -ItemType Directory -Force -Path "$ArchivePath\reports"

# === 2. Git 初始化 ===
$gitExists = $null -ne (Get-Command git -ErrorAction SilentlyContinue)
if (-not $gitExists) {
    Write-Host "⚠️ 未检测到 Git，请安装 Git 后手动运行：git init"
} else {
    Set-Location "$ArchivePath"
    git init 2>$null
    git checkout -b main 2>$null
}

# === 3. .gitignore ===
@"
node_modules/
*.log
.DS_Store
Thumbs.db
"@ | Out-File -FilePath "$ArchivePath\.gitignore" -Encoding utf8 -Force

# === 4. config.json ===
$dateStr = Get-Date -Format "yyyy-MM-dd"
$config = @{
    version = "1.0"
    name = "我的知识追踪档案"
    createdAt = $dateStr
    archivePath = $ArchivePath
    gitInitialized = $gitExists
    profiles = @()
} | ConvertTo-Json -Depth 4

$config | Out-File -FilePath "$ArchivePath\config.json" -Encoding utf8 -Force

# === 5. tracking/CHANGELOG.md ===
$changelogContent = @"
# 知识追踪档案变更日志

## v1.0 — $dateStr

- 初始版本，知识追踪档案创建
- 目录结构初始化完成
"@

$changelogContent | Out-File -FilePath "$ArchivePath\tracking\CHANGELOG.md" -Encoding utf8 -Force

# === 6. tracking/mastery-matrix.json ===
$matrix = @{
    version = "1.0"
    lastUpdated = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss")
    dimensions = @()
    overall = @{
        testedDimensions = 0
        totalDimensions = 0
        masteredCount = 0
        atRiskCount = 0
        criticalCount = 0
        narrativeRiskTrend = "unknown"
    }
} | ConvertTo-Json -Depth 4

$matrix | Out-File -FilePath "$ArchivePath\tracking\mastery-matrix.json" -Encoding utf8 -Force

# === 7. tracking/weak-points-log.json ===
$weakPoints = @{
    version = "1.0"
    lastUpdated = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss")
    entries = @()
} | ConvertTo-Json -Depth 4

$weakPoints | Out-File -FilePath "$ArchivePath\tracking\weak-points-log.json" -Encoding utf8 -Force

# === 8. tracking/improvement-timeline.md ===
$timelineContent = @"
# 改进时间线

记录每次测试后的改进追踪：

- [ ] 首次测试完成，等待归因分析...
"@

$timelineContent | Out-File -FilePath "$ArchivePath\tracking\improvement-timeline.md" -Encoding utf8 -Force

# === 9. README.md ===
$readmeContent = @"
# 知识追踪档案

创建于：$dateStr

## 目录说明

| 目录 | 用途 |
|------|------|
| `profiles/` | 专项训练档案（如 React 面试、AI 认知提升等） |
| `sessions/` | 每次答题的原始数据（题库、结果、归因） |
| `tracking/` | 跨会话追踪数据（掌握度矩阵、薄弱点日志、变更日志） |
| `reports/` | 汇总报告（趋势分析、综合评估） |

## Git 版本控制

本档案已启用 Git 版本控制。每次答题完成后会自动 commit，
你可以随时查看历史：

```bash
git log --oneline
```

## 开始使用

告诉 Agent 你要准备什么方向的面试或学习，
InterviewForge 会为你生成测试并开始追踪。
"@

$readmeContent | Out-File -FilePath "$ArchivePath\README.md" -Encoding utf8 -Force
```

### Step 3：持久化档案路径

**必须通过 `update_memory` 工具将档案路径写入持久化知识库。**

- **title**: `interview-forge-archive-path`
- **knowledge_to_store**: 用户指定的完整档案路径（绝对路径）

> 后续每次 Skill 启动时，通过 `conversation_search` 检索此记忆获取档案路径。

### Step 4：告知用户

```
✅ 知识追踪档案已创建！

📁 路径：{archive-path}
📦 已初始化：
   • config.json — 档案总控配置
   • profiles/ — 专项训练档案（待创建）
   • sessions/ — 答题数据（待写入）
   • tracking/ — 跨会话追踪（空矩阵 + 变更日志）
   • reports/ — 汇总报告（待生成）
   • README.md — 档案使用说明
   • Git 版本控制已启用

现在可以开始面试或学习测试了。
你说要准备什么方向，我来出题并追踪你的进步。
```

## 复用已有档案

如果检测到路径下已有 `config.json` 和 `.git/`，直接复用：

```
✅ 检测到已有知识追踪档案，直接复用。

📁 路径：{archive-path}
📊 当前档案概况：
   • 创建日期：{config.createdAt}
   • 专项数量：{config.profiles.Length}

继续开始面试或学习测试吧。
```

## 注意事项

1. **路径持久化**：档案路径一旦设定，贯穿所有后续 session，除非用户明确要求切换
2. **Git 依赖**：如系统未安装 Git，档案功能仍可用，但无法自动 commit。提示用户安装 Git 后手动初始化
3. **权限问题**：初始化前验证目录可写性，避免后续写入失败
4. **编码统一**：所有文件使用 UTF-8 编码，Windows PowerShell 默认即为 UTF-8（PowerShell 6+）
