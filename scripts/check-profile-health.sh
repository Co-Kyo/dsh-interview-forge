#!/usr/bin/env sh
# dsh web profile 安装副本健康检查。
# 背景事故（2026-08-23）：构建产物被「平铺拷贝覆盖」到包根，入口 main: lib/index.js 找不到
# lib/ → ERR_MODULE_NOT_FOUND，插件树整体加载失败。pnpm hoisted 真实目录模式，污染即时生效。
# 用法：sh scripts/check-profile-health.sh [PROFILE 安装目录]
#   默认 ~/.dsh/profiles/web/node_modules/dsh-interview-forge
set -eu

P="${1:-$HOME/.dsh/profiles/web/node_modules/dsh-interview-forge}"
REPO="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
fails=0
ok() { echo "  ✅ $1"; }
bad() { echo "  ❌ $1"; fails=$((fails+1)); }

echo "检查：$P"
[ -d "$P" ] || { echo "安装目录不存在"; exit 2; }

# 1) 入口与 lib 目录
main=$(node -p "require('$P/package.json').main" 2>/dev/null || echo "")
[ -n "$main" ] || bad "package.json main 缺失"; [ -n "$main" ] && ok "main = $main"
[ -f "$P/$main" ] && ok "入口文件存在: $main" || bad "入口文件不存在: $main（包根污染/损坏）"

# 2) 包根不得残留顶层构建产物
for f in client.js index.js forge-gateway.js; do
  [ -f "$P/$f" ] && bad "污染残留: 包根 $f 应删" || ok "包根无 $f"
done

# 3) 版本与关键新文件（与源码仓库一致才算本轮版本）
v=$(node -p "require('$P/package.json').version" 2>/dev/null || echo "?")
rv=$(node -p "require('$REPO/package.json').version" 2>/dev/null || echo "?")
[ "$v" = "$rv" ] && ok "版本一致 v$v" || bad "版本不一致 安装=$v 仓库=$rv"
[ -f "$P/scripts/render-report.cjs" ] && ok "report 渲染器在" || bad "report 渲染器缺"
[ -f "$P/scripts/lib/stats.js" ] && ok "stats 模块在（安装展平路径）" || bad "stats 模块缺"
# 客户端 bundle 新标记比对
n=$(grep -c "forge-card--report" "$P/lib/client.js" 2>/dev/null || echo 0)
[ "$n" -gt 0 ] && ok "client bundle 含版式标记" || bad "client bundle 疑为旧构建"

echo "---"
if [ "$fails" -gt 0 ]; then echo "HEALTH FAILED（$fails 项）"; exit 1; fi
echo "HEALTH OK —— 可继续；若刚变更过源码，请重新打包 tgz 后 dsh plugin add 重装（禁止手工拷贝覆盖）"
