// InterviewForge 速练 — host 跨端网关 + 共享 store（单例）
// 参照官方 packages/host/plugin-inventory/src/index.ts。
// - 导出单例 store（sessions/order/磁盘持久），lib/index.js 的工具与 ForgeGateway 共用。
// - ForgeGateway extends TypertRemoteService('forge')：client 半边 ctx.remote.forge.* 的目标。
import type { Context } from '@deepseek-ai/cordis'
import { TypertRemoteService, Remote } from '@deepseek-ai/dsh-typert-protocol'

function pad(n: number): string {
  return String(n).padStart(2, '0')
}
export function stamp(): string {
  const d = new Date()
  return 'if-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds())
}
export function dateDir(): string {
  const d = new Date()
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
}
export function freshProgress(): Record<string, unknown> {
  return { currentIndex: 0, answers: {}, globalStartTime: 0, questionStartTime: 0, pausedAt: 0, started: false }
}

export interface ForgeEntryLike {
  sessionId: string
  quiz: { meta: { title: string }; questions: Array<{ id: string; type: string; answer?: string | null }> }
  archiveDir: string
  quizPath: string
  resultPath: string
  status: string
  startedAt: number
  result: unknown
  reportHtml: string | null
  ownerSessionId: string
  progress: Record<string, unknown> & { answers: Record<string, unknown>; currentIndex: number; pausedAt: number }
  seeded?: boolean
}

function toListItem(entry: ForgeEntryLike): {
  sessionId: string; dshSessionId: string | null; title: string; totalQuestions: number; status: string; createdAt: number; archiveDir: string | null
} {
  return {
    sessionId: entry.sessionId,
    dshSessionId: entry.ownerSessionId || null,
    title: entry.quiz.meta.title,
    totalQuestions: entry.quiz.questions.length,
    status: entry.status,
    createdAt: entry.startedAt,
    archiveDir: entry.archiveDir || null,
  }
}

function createdAtFromSid(sid: string): number {
  const m = /^if-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})$/.exec(sid)
  if (!m) return 0
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6])).getTime()
}

/** 共享会话 store（模块级单例：工具与网关同实例）。 */
export class ForgeStore {
  sessions = new Map<string, ForgeEntryLike>()
  order: string[] = []
  lastArchiveDir: string | null = null
  lastWorkspace: string | null = null

  latestEntry(): ForgeEntryLike | undefined {
    if (this.order.length === 0) return undefined
    return this.sessions.get(this.order[this.order.length - 1])
  }
  findEntry(sid: string | undefined): ForgeEntryLike | undefined {
    if (!sid) return this.latestEntry()
    if (this.sessions.has(sid)) return this.sessions.get(sid)
    return this.entryForOwner(sid)
  }
  entryForOwner(ownerSid: string | undefined): ForgeEntryLike | undefined {
    if (!ownerSid) return undefined
    for (let i = this.order.length - 1; i >= 0; i--) {
      const e = this.sessions.get(this.order[i])
      if (e && e.ownerSessionId === ownerSid) return e
    }
    return undefined
  }
  clear(): void {
    this.sessions.clear()
    this.order.length = 0
  }
}

export const store = new ForgeStore()

async function scanArchive(fs: any, roots: string[], year?: string | null, month?: string | null): Promise<any[]> {
  const daysMap = new Map<string, { year: number; month: number; day: number; entries: unknown[] }>()
  const seen = new Set<string>()
  for (const root of [...new Set(roots)]) {
    let sdir: any
    try { sdir = await fs.resolve(root + '/sessions') } catch { continue }
    let dateDirs: any[]
    try { dateDirs = await fs.listDir(sdir) } catch { continue }
    for (const d of dateDirs) {
      if (d.type !== 'directory') continue
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d.name)
      if (!m) continue
      if (year && m[1] !== year) continue
      if (month && m[2] !== month) continue
      let files: any[]
      try { files = await fs.listDir(d.target) } catch { continue }
      for (const f of files) {
        if (f.type !== 'file') continue
        const qm = /^quiz-(if-[\d-]+)\.json$/.exec(f.name)
        if (!qm) continue
        const sid = qm[1]
        if (seen.has(sid)) continue
        seen.add(sid)
        let quiz: any = null
        try { quiz = JSON.parse(await fs.readText(f.target)) } catch { continue }
        if (!quiz || !quiz.meta) continue
        const hasResult = files.some((x: any) => x.name === 'result-' + sid + '.json')
        const hasReport = files.some((x: any) => x.name === 'report-' + sid + '.html')
        let result: any = null
        if (hasResult) {
          try {
            const rf = files.find((x: any) => x.name === 'result-' + sid + '.json')
            result = JSON.parse(await fs.readText(rf.target))
          } catch { result = null }
        }
        let correctCount = 0
        let accuracy: number | null = null
        let durationMs: number | null = null
        let status = hasReport ? 'reported' : (hasResult ? 'submitted' : 'answering')
        if (result) {
          durationMs = result.globalDuration || null
          if (result.answers && Array.isArray(quiz.questions)) {
            for (const q of quiz.questions) {
              const a = result.answers[q.id]
              if (a && q.type === 'choice' && a.selected != null && q.answer != null && String(a.selected) === String(q.answer)) correctCount++
            }
            accuracy = quiz.questions.length > 0 ? Math.round(correctCount / quiz.questions.length * 100) : null
          }
        }
        const key = m[1] + '-' + m[2] + '-' + m[3]
        const bucket = daysMap.get(key) || { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]), entries: [] }
        bucket.entries.push({ sessionId: sid, title: quiz.meta.title || sid, totalQuestions: Array.isArray(quiz.questions) ? quiz.questions.length : 0, correctCount, accuracy, durationMs, status })
        daysMap.set(key, bucket)
      }
    }
  }
  return [...daysMap.values()].sort((a, b) => a.day - b.day)
}

/** 收集候选 archive 根目录：进程重启后仍能发现磁盘历史（修复浮层队列为空）。 */
async function discoverRoots(ctx: Context): Promise<string[]> {
  const roots: string[] = []
  if (store.lastArchiveDir) roots.push(store.lastArchiveDir)
  if (store.lastWorkspace) roots.push(store.lastWorkspace + '/interview-forge-archive')
  try { if (process.cwd()) roots.push(process.cwd() + '/interview-forge-archive') } catch { /* noop */ }
  // 插件自身位置锚点：本部署为工作区 link 安装（<workspace>/forge-plugin/lib/），
  // 从 import.meta.url 反推工作区根，进程 cwd 无关、重启可靠。
  try {
    const here = decodeURIComponent(new URL('.', import.meta.url).pathname)
    const ws = here.replace(/\/lib\/$/, '').replace(/\/forge-plugin$/, '')
    if (ws && ws !== here) roots.push(ws + '/interview-forge-archive')
  } catch { /* noop */ }
  // 从活跃会话头收集 cwd（会话服务可枚举时）
  try {
    const sessions: any = (ctx as any).get('sessions')
    const vals: any[] =
      sessions && typeof sessions.values === 'function' ? [...sessions.values()] :
      sessions && typeof sessions[Symbol.iterator] === 'function' ? [...sessions] : []
    for (const s of vals) {
      const cwd = s && s.header && s.header.cwd
      if (cwd) roots.push(String(cwd) + '/interview-forge-archive')
    }
  } catch { /* noop */ }
  return [...new Set(roots.filter(Boolean))] as string[]
}

/** 按 sessionId 从磁盘懒加载水合一条历史会话进 store（load/answer/finish 等的前置）。 */
export async function hydrateEntry(ctx: Context, sid: string): Promise<ForgeEntryLike | undefined> {
  if (!sid) return undefined
  if (store.sessions.has(sid)) return store.sessions.get(sid)
  const fs: any = ctx.get('fs')
  if (!fs) return undefined
  const m = /^if-(\d{4})(\d{2})(\d{2})-/.exec(sid)
  if (!m) return undefined
  const date = m[1] + '-' + m[2] + '-' + m[3]
  for (const root of await discoverRoots(ctx)) {
    const dir = root + '/sessions/' + date
    let quiz: any = null
    try { quiz = JSON.parse(await fs.readText(await fs.resolve(dir + '/quiz-' + sid + '.json'))) } catch { continue }
    if (!quiz || !quiz.meta || !Array.isArray(quiz.questions)) continue
    let result: any = null
    let reportHtml: string | null = null
    try { result = JSON.parse(await fs.readText(await fs.resolve(dir + '/result-' + sid + '.json'))) } catch { /* none */ }
    try { reportHtml = await fs.readText(await fs.resolve(dir + '/report-' + sid + '.html')) } catch { /* none */ }
    const status = reportHtml ? 'reported' : (result ? 'submitted' : 'answering')
    const entry: ForgeEntryLike = {
      sessionId: sid,
      quiz,
      archiveDir: root,
      quizPath: dir + '/quiz-' + sid + '.json',
      resultPath: dir + '/result-' + sid + '.json',
      status,
      startedAt: createdAtFromSid(sid),
      result,
      reportHtml,
      ownerSessionId: '',
      progress: freshProgress() as ForgeEntryLike['progress'],
      seeded: !!result,
    }
    // 并发竞态防护：applySeed/load/snapshot 可能同时触发水合，插入前同步重查（check+set 同步原子）
    if (store.sessions.has(sid)) return store.sessions.get(sid)
    store.sessions.set(sid, entry)
    store.order.push(sid)
    if (!store.lastArchiveDir) store.lastArchiveDir = root
    return entry
  }
  return undefined
}

export async function diskEntries(ctx: Context): Promise<ReturnType<typeof toListItem>[]> {
  const fs: any = ctx.get('fs')
  if (!fs) return []
  const roots: string[] = await discoverRoots(ctx)
  if (roots.length === 0) return []
  const days = await scanArchive(fs, roots, null, null)
  const out: ReturnType<typeof toListItem>[] = []
  for (const d of days) for (const en of d.entries as any[]) {
    out.push({
      sessionId: en.sessionId,
      dshSessionId: null,
      title: en.title,
      totalQuestions: en.totalQuestions,
      status: en.status,
      createdAt: createdAtFromSid(en.sessionId),
      archiveDir: null,
    })
  }
  return out
}

// ---- Remote gateway ----
export class ForgeGateway extends TypertRemoteService {
  constructor(ctx: Context) {
    super(ctx, 'forge')
  }

  /** 内存命中则返回；否则尝试从磁盘水合历史会话。 */
  private async ensureEntry(sid?: string): Promise<ForgeEntryLike | undefined> {
    const found = store.findEntry(sid)
    if (found) return found
    if (!sid) return undefined
    return hydrateEntry(this.ctx, sid)
  }

  @Remote('list')
  async list(): Promise<{ entries: ReturnType<typeof toListItem>[] }> {
    const entries: ReturnType<typeof toListItem>[] = []
    const seenOrder = new Set<string>()
    for (let i = store.order.length - 1; i >= 0; i--) {
      const sid = store.order[i]
      if (seenOrder.has(sid)) continue
      const e = store.sessions.get(sid)
      if (e) { seenOrder.add(sid); entries.push(toListItem(e)) }
    }
    const have = new Set(entries.map((e) => e.sessionId))
    for (const d of await diskEntries(this.ctx)) if (!have.has(d.sessionId)) { entries.push(d); have.add(d.sessionId) }
    entries.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    return { entries }
  }

  /** 历史 dashboard 数据：按日分桶的全部练习。磁盘档案为主（scanArchive 推导状态/正确率/耗时），
   *  内存未落盘条目兜底合并；按日期降序，供月历视图本地翻月渲染。 */
  @Remote('history')
  async history(): Promise<{
    days: Array<{
      year: number; month: number; day: number
      entries: Array<{ sessionId: string; title: string; totalQuestions: number; status: string; correctCount: number; accuracy: number | null; durationMs: number | null }>
    }>
  }> {
    type HistEntry = { sessionId: string; title: string; totalQuestions: number; status: string; correctCount: number; accuracy: number | null; durationMs: number | null }
    type Bucket = { year: number; month: number; day: number; entries: HistEntry[] }
    const days = new Map<string, Bucket>()
    const bucketFor = (year: number, month: number, day: number): Bucket => {
      const key = `${year}-${pad(month)}-${pad(day)}`
      let b = days.get(key)
      if (!b) { b = { year, month, day, entries: [] }; days.set(key, b) }
      return b
    }
    const seen = new Set<string>()
    // 磁盘档案：scanArchive 已推导 correctCount / accuracy / durationMs / status
    const fs = this.ctx.get('fs')
    if (fs) {
      for (const bucket of await scanArchive(fs, await discoverRoots(this.ctx), null, null)) {
        const b = bucketFor(Number(bucket.year), Number(bucket.month), Number(bucket.day))
        for (const en of bucket.entries as HistEntry[]) {
          if (!en || seen.has(String(en.sessionId))) continue
          seen.add(String(en.sessionId))
          b.entries.push(en)
        }
      }
    }
    // 内存条目兜底（尚未落盘或根目录不可达的会话）
    for (let i = store.order.length - 1; i >= 0; i--) {
      const e = store.sessions.get(store.order[i])
      if (!e || seen.has(e.sessionId)) continue
      seen.add(e.sessionId)
      const questions = e.quiz.questions as Array<{ id: string; type?: string; answer?: string | null }>
      let correct = 0
      for (const q of questions) {
        const a = (e.progress?.answers || {})[q.id] as { selected?: string | null } | undefined
        if (a && q.type === 'choice' && a.selected != null && q.answer != null && String(a.selected) === String(q.answer)) correct++
      }
      const b = bucketFor(new Date(e.startedAt || createdAtFromSid(e.sessionId) || Date.now()).getFullYear(), new Date(e.startedAt || createdAtFromSid(e.sessionId) || Date.now()).getMonth() + 1, new Date(e.startedAt || createdAtFromSid(e.sessionId) || Date.now()).getDate())
      b.entries.push({ sessionId: e.sessionId, title: e.quiz.meta.title, totalQuestions: questions.length, status: e.status, correctCount: correct, accuracy: questions.length ? Math.round(correct / questions.length * 100) : null, durationMs: null })
    }
    return { days: [...days.values()].sort((a, b) => ((b.year - a.year) || (b.month - a.month) || (b.day - a.day))) }
  }

  @Remote('load')
  async load(args: { sessionId?: string }): Promise<unknown> {
    const entry = await this.ensureEntry(args.sessionId)
    if (!entry) return null
    return {
      sessionId: entry.sessionId,
      quiz: entry.quiz,
      meta: entry.quiz.meta,
      status: entry.status,
      startedAt: entry.startedAt,
      progress: { currentIndex: entry.progress.currentIndex, answers: entry.progress.answers },
    }
  }

  @Remote('snapshot')
  async snapshot(args: { sessionId: string }): Promise<unknown> {
    const entry = await this.ensureEntry(args.sessionId)
    if (!entry) return null
    const p = entry.progress
    const now = Date.now()
    const base: number = (p.pausedAt as number) || now
    return {
      sessionId: entry.sessionId,
      status: entry.status,
      started: p.started === true,
      currentIndex: p.currentIndex,
      answers: p.answers,
      elapsedGlobal: p.started ? Math.max(0, Math.floor((base - (p.globalStartTime as number)) / 1000)) : 0,
      elapsedQuestion: p.started ? Math.max(0, Math.floor((base - (p.questionStartTime as number)) / 1000)) : 0,
    }
  }

  @Remote('applySeed')
  async applySeed(args: { sessionId: string }): Promise<{ ok: boolean; seeded?: number; reason?: string }> {
    const entry = await this.ensureEntry(args.sessionId)
    if (!entry || entry.seeded) return { ok: false, reason: 'no-entry-or-seeded' }
    const fs: any = this.ctx.get('fs')
    if (!fs) return { ok: false, reason: 'no-fs' }
    const seedPath = entry.archiveDir + '/sessions/' + dateDir() + '/seed-' + entry.sessionId + '.json'
    let seed: any = null
    try { seed = JSON.parse(await fs.readText(await fs.resolve(seedPath))) } catch { return { ok: false, reason: 'no-seed' } }
    const answers = (seed && seed.answers) || {}
    for (const qid of Object.keys(answers)) {
      const a = answers[qid] || {}
      const rec: Record<string, unknown> = { questionId: qid, startTime: entry.progress.questionStartTime, endTime: Date.now(), duration: 0 }
      if (a.selected != null) rec.selected = a.selected
      if (a.note != null) rec.note = a.note
      entry.progress.answers[qid] = rec
    }
    entry.seeded = true
    return { ok: true, seeded: Object.keys(answers).length }
  }

  @Remote('answer')
  async answer(args: { sessionId: string; questionId: string; selected?: string | null; note?: string | null }): Promise<{ ok: boolean }> {
    const entry = await this.ensureEntry(args.sessionId)
    if (!entry) throw new Error('未知的 sessionId: ' + args.sessionId)
    const p = entry.progress
    const end: number = (p.pausedAt as number) || Date.now()
    const rec: Record<string, unknown> = {
      questionId: args.questionId,
      startTime: p.questionStartTime,
      endTime: end,
      duration: Math.max(0, end - (p.questionStartTime as number)),
    }
    if (args.selected != null) rec.selected = args.selected
    if (args.note != null) rec.note = args.note
    p.answers[args.questionId] = rec
    return { ok: true }
  }

  @Remote('nav')
  async nav(args: { sessionId: string; index: number }): Promise<{ ok: boolean }> {
    const entry = await this.ensureEntry(args.sessionId)
    if (!entry) throw new Error('未知的 sessionId: ' + args.sessionId)
    entry.progress.currentIndex = args.index
    if (entry.progress.pausedAt === 0) entry.progress.questionStartTime = Date.now()
    return { ok: true }
  }

  @Remote('pause')
  async pause(args: { sessionId: string }): Promise<{ ok: boolean }> {
    const entry = await this.ensureEntry(args.sessionId)
    if (!entry) throw new Error('未知的 sessionId: ' + args.sessionId)
    const p = entry.progress
    if (p.started && p.pausedAt === 0) p.pausedAt = Date.now()
    return { ok: true }
  }

  @Remote('resume')
  async resume(args: { sessionId: string }): Promise<{ ok: boolean }> {
    const entry = await this.ensureEntry(args.sessionId)
    if (!entry) throw new Error('未知的 sessionId: ' + args.sessionId)
    const p = entry.progress
    const now = Date.now()
    if (!p.started) {
      p.started = true
      p.globalStartTime = now
      p.questionStartTime = now
    } else if (p.pausedAt !== 0) {
      const delta = now - (p.pausedAt as number)
      p.pausedAt = 0
      if (delta > 0) { p.globalStartTime = (p.globalStartTime as number) + delta; p.questionStartTime = (p.questionStartTime as number) + delta }
    }
    return { ok: true }
  }

  @Remote('finish')
  async finish(args: { sessionId: string }): Promise<{ ok: boolean }> {
    if (!args || !args.sessionId) throw new Error('forge.finish 需要 sessionId')
    const entry = await this.ensureEntry(args.sessionId)
    if (!entry) throw new Error('未知的 sessionId: ' + args.sessionId)
    const fs: any = this.ctx.get('fs')
    if (!fs) throw new Error('fs 服务不可用，无法写入答题结果')
    const p = entry.progress
    const now = Date.now()
    const end: number = (p.pausedAt as number) || now
    const result = {
      sessionId: entry.sessionId,
      quizMeta: entry.quiz.meta,
      globalStartTime: p.globalStartTime,
      globalEndTime: end,
      globalDuration: p.started ? Math.max(0, end - (p.globalStartTime as number)) : 0,
      answers: { ...p.answers },
      status: 'completed',
    }
    await fs.writeText(await fs.resolve(entry.resultPath), JSON.stringify(result, null, 2))
    entry.status = 'submitted'
    entry.result = result
    return { ok: true }
  }

  @Remote('report')
  async report(args: { sessionId: string }): Promise<{ reportHtml: string | null }> {
    const entry = await this.ensureEntry(args.sessionId)
    if (entry && entry.reportHtml) return { reportHtml: entry.reportHtml }
    const fs: any = this.ctx.get('fs')
    const m = /^if-(\d{4})(\d{2})(\d{2})-/.exec(args.sessionId || '')
    if (fs && m) {
      for (const root of await discoverRoots(this.ctx)) {
        try {
          const p = root + '/sessions/' + m[1] + '-' + m[2] + '-' + m[3] + '/report-' + args.sessionId + '.html'
          const html = await fs.readText(await fs.resolve(p))
          return { reportHtml: html }
        } catch { /* try next root */ }
      }
    }
    return { reportHtml: null }
  }
}

export default ForgeGateway