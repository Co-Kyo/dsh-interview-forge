// 冒烟测试：模拟进程重启后的干净 store，验证磁盘历史可被发现+水合。
// 用法：cd <workspace> && node forge-plugin/scripts/smoke-disk-recovery.mjs
import fs from 'node:fs'
import { diskEntries, hydrateEntry, store } from '../lib/forge-gateway.js'

const fakeFs = {
  resolve: async (p) => p,
  listDir: async (d) => fs.readdirSync(d, { withFileTypes: true }).map(e => ({
    name: e.name, type: e.isDirectory() ? 'directory' : 'file', target: d + '/' + e.name,
  })),
  readText: async (p) => fs.readFileSync(p, 'utf8'),
  writeText: async (p, c) => { fs.writeFileSync(p, c) },
}
const ctx = { get: (k) => (k === 'fs' ? fakeFs : undefined) }

console.log('store 初始 lastArchiveDir =', store.lastArchiveDir)
const entries = await diskEntries(ctx)
console.log('diskEntries 发现', entries.length, '条:')
for (const e of entries) console.log(' -', e.sessionId, '|', e.title, '|', e.status)

// 直测水合：未完成场 / 已报告场
const h1 = await hydrateEntry(ctx, 'if-20260821-121132')
console.log('hydrate(08-21 未完成场) →', h1 ? ('status=' + h1.status + ', archiveDir=' + h1.archiveDir + ', resultPath=' + h1.resultPath) : 'undefined')
const h2 = await hydrateEntry(ctx, 'if-20260819-015627')
console.log('hydrate(08-19 已报告场) →', h2 ? ('status=' + h2.status + ', reportHtml=' + (h2.reportHtml ? h2.reportHtml.length + ' chars' : 'null') + ', result=' + (h2.result ? 'yes' : 'no')) : 'undefined')
console.log('store.lastArchiveDir =', store.lastArchiveDir)
console.log('store 内存条目数 =', store.sessions.size)
