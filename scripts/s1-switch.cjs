// S1 一次性重构脚本：cjs 切换 stats 模块 + validateSource 扩域 + exports 守卫。
// 用完即删。
'use strict';
const fs = require('fs');
const f = 'skill/scripts/render-report.cjs';
let s = fs.readFileSync(f, 'utf8');

// 1) 删除本地 band/compute*/helper 块（从 S1 注释到 renderQuestionCards 之前）
s = s.replace(/\/\/ S1: 改为[\s\S]*?(?=function renderQuestionCards\(data\) \{)/, '');

// 2) 头部接 stats 模块
const usesBand = /[^a-zA-Z]band\(/.test(s);
const importLine = "const { getCognitionTag, getCognitionLabel, riskBadgeClass, HIGH_RISK_TAGS,\n  computeDimensionScores, computeNarrativeRiskStats, computeRiskSummary,\n  computeChoiceStats, computeHighRiskQuestionCount," + (usesBand ? "\n  band," : "") + "\n} = require('./lib/stats.js');\n";
s = s.replace("const path = require('path');\n", "const path = require('path');\n" + importLine);

// 3) validateSource 扫描域扩展
const newValidate = "function validateSource() {\n" +
  "  const files = fs.readdirSync(__dirname).filter(f => /\\.(c?js)$/.test(f))\n" +
  "    .concat(fs.readdirSync(path.join(__dirname, 'lib')).filter(f => /\\.(c?js)$/.test(f)).map(f => 'lib/' + f));\n" +
  "  const problems = [];\n" +
  "  for (const file of files) {\n" +
  "    const src = fs.readFileSync(path.join(__dirname, file), 'utf8').replace(/const ENV_BLOCKLIST[\s\S]*?];/, '');\n" +
  "    const lower = String(src).toLowerCase();\n" +
  "    for (const term of ENV_BLOCKLIST) {\n" +
  "      if (lower.includes(term)) problems.push(file + ' 含环境痕迹: \"' + term + '\"');\n" +
  "    }\n" +
  "  }\n" +
  "  return problems;\n" +
  "}";
const start = s.indexOf('function validateSource() {');
const end = s.indexOf('\n}', start);
if (start < 0 || end < 0) { console.error('validateSource anchor not found'); process.exit(1); }
s = s.slice(0, start) + newValidate + s.slice(end + 1);

// 4) exports + main 守卫
s = s.replace(/\nmain\(\);\s*$/, "\n\nmodule.exports = { renderReport };\nif (require.main === module) main();\n");

fs.writeFileSync(f, s);
console.log('S1 手术完成, band 使用:', usesBand ? '是→导入 band' : '否→不导入');
