#!/usr/bin/env node
/** E2E 门禁入口：真实答题流程测试在 e2e/quiz.spec.ts（Playwright，直击 live GUI）。
 *  运行：node scripts/e2e-quiz-flow.mjs（等价 npm run e2e）。
 *  覆盖：T1 计时器递增 / T2 切题不串台（UI+宿主双校验）/ T3 收起草稿保留+计时恢复。 */
import { spawnSync } from 'node:child_process'

const r = spawnSync('npx', ['playwright', 'test', ...process.argv.slice(2)], { stdio: 'inherit' })
process.exit(r.status ?? 1)
