// InterviewForge 速练 — 标准 DSH 宿主插件（host 半边）
// ---------------------------------------------------------------------------
// 标准宿主 Cordis 插件：
//   - 工具：ctx.tools.register(defineTool({...}))   （defineTool 来自 @deepseek-ai/dsh-tools）
//   - 跨端：ForgeGateway（TypertRemoteService 'forge'，lib/forge-gateway.js），
//     client 半边 $mount 的 remote.forge.* 经 /api 路由到 forge/<method>，
//     host api-gateway 走 SRC 回退命中，无需生成 ./typert 产物。
//   - 配套 skill：ctx.skills.registerProvider(...) 把包内 skill/ 目录作为
//     SkillProvider 挂进宿主注册表（官方 skill-badge 同款模式）——装一个包 =
//     工具 + 浮层 UI + skill 三件套同版本发布。
//   - 持久：题库/结果/归因/报告全部落盘 interview-forge-archive；启动时可从磁盘扫描恢复。
// 注意：@deepseek-ai/* 声明为 peerDependencies——DSH 用 $DSH_HOME/profiles/node_modules
// 平铺回退目录把安装闭包 symlink 给所有 profile，peer 不装副本才能与宿主同一物理实例
// （typert @Remote marker 存于模块私有 WeakMap，双实例 = forge/* RPC 404）。
// ---------------------------------------------------------------------------
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { BUNDLED_SKILL_RANK } from '@deepseek-ai/dsh-skill'
import { ForgeGateway, store as sharedStore, hydrateEntry, resolveLatestEntry } from './forge-gateway.js'

// ---- 配套 skill（随包分发，官方 skill-badge 模式）----
const SKILL_PROVIDER_NAME = 'interview-forge'
const SKILL_BODY_URL = new URL('../skill/SKILL.md', import.meta.url)
const SKILL_RESOURCE_BASE = {
  kind: 'directory',
  path: fileURLToPath(new URL('../skill/', import.meta.url)),
}
const forgeSkillProvider = {
  name: SKILL_PROVIDER_NAME,
  list() {
    return Promise.resolve([{
      name: 'interview-forge',
      description: '快速练习与反馈系统（InterviewForge 速练）。当用户说「开始练习」「快速练习」「练一组」「出题」时进入阶段1（出题+⚡浮层答题）；说「答完了」「出报告」时触发阶段2（交叉检验归因+雷达报告）。配套工具 forge_start/forge_result/forge_report_ready 由本插件提供。',
      invocation: { modelInvocable: true, userInvocable: true },
      provider: SKILL_PROVIDER_NAME,
      source: 'bundled',
      resourceBase: SKILL_RESOURCE_BASE,
      rank: BUNDLED_SKILL_RANK,
      locator: SKILL_BODY_URL,
    }])
  },
  async get(candidate) {
    return {
      ...candidate,
      resourceBase: SKILL_RESOURCE_BASE,
      content: await readFile(SKILL_BODY_URL, 'utf8'),
    }
  },
}

function pad(n) {
  return String(n).padStart(2, '0')
}
function stamp() {
  const d = new Date()
  return 'if-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds())
}
function dateDir() {
  const d = new Date()
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
}

// ---- 会话状态：使用 forge-gateway.js 导出的共享单例 store ----
// （工具与 ForgeGateway 同一实例；lastArchiveDir/lastWorkspace 由工具在 execute 时写入）

function freshProgress() {
  return { currentIndex: 0, answers: {}, globalStartTime: 0, questionStartTime: 0, pausedAt: 0, started: false }
}

function workspaceFromCtxSessions(ctx, sessionId) {
  try {
    if (!sessionId || !ctx.sessions) return null
    const sess = ctx.sessions.get(String(sessionId))
    return sess && sess.header && sess.header.cwd ? sess.header.cwd : null
  } catch (e) { return null }
}

// 从磁盘 archive 扫描一个日期的会话清单（跨重启恢复历史）
async function scanArchive(fs, roots, year, month) {
  const daysMap = new Map()
  const seen = new Set()
  for (const root of [...new Set(roots)]) {
    let sdir
    try { sdir = await fs.resolve(root + '/sessions') } catch (e) { continue }
    let dateDirs
    try { dateDirs = await fs.listDir(sdir) } catch (e) { continue }
    for (const d of dateDirs) {
      if (d.type !== 'directory') continue
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d.name)
      if (!m) continue
      if (year && m[1] !== year) continue
      if (month && m[2] !== month) continue
      let files
      try { files = await fs.listDir(d.target) } catch (e) { continue }
      for (const f of files) {
        if (f.type !== 'file') continue
        const qm = /^quiz-(if-[\d-]+)\.json$/.exec(f.name)
        if (!qm) continue
        const sid = qm[1]
        if (seen.has(sid)) continue
        seen.add(sid)
        let quiz = null
        try { quiz = JSON.parse(await fs.readText(f.target)) } catch (e) { continue }
        if (!quiz || !quiz.meta) continue
        const hasResult = files.some((x) => x.name === 'result-' + sid + '.json')
        const hasReport = files.some((x) => x.name === 'report-' + sid + '.html')
        let result = null
        if (hasResult) {
          try {
            const rf = files.find((x) => x.name === 'result-' + sid + '.json')
            result = JSON.parse(await fs.readText(rf.target))
          } catch (e) { result = null }
        }
        let correctCount = 0
        let accuracy = null
        let durationMs = null
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
        bucket.entries.push({
          sessionId: sid,
          title: quiz.meta.title || sid,
          totalQuestions: Array.isArray(quiz.questions) ? quiz.questions.length : 0,
          correctCount, accuracy, durationMs, status,
        })
        daysMap.set(key, bucket)
      }
    }
  }
  return [...daysMap.values()].sort((a, b) => a.day - b.day)
}

function createdAtFromSid(sid) {
  const m = /^if-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})$/.exec(sid)
  if (!m) return 0
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6])).getTime()
}

export const name = 'interview-forge'
export const inject = ['sessions', 'tools', 'skills']

export function apply(ctx) {
  const store = sharedStore

  // ---- 工具 1：启动一组速练 ----
  const startTool = defineTool({
    name: 'forge_start',
    description: '启动一组 InterviewForge 速练练习：把符合 quiz.schema.json 的题库 JSON 写入档案目录并创建会话，记录发起会话归属。答题入口为 Web 右下角速练浮层（⚡），启动后队列自动出现该练习。调用前请用 bash 先 mkdir -p 创建 <archiveDir>/sessions 目录。',
    parameters: {
      quiz: { type: 'object', additionalProperties: true, required: true, description: '题库 JSON：{ meta: { title, totalQuestions, tags }, questions: [ { id, type: choice|open, category, stem, options?, answer?, explanation? } ] }' },
      archiveDir: { type: 'string', required: true, description: '档案目录绝对路径，例如 /home/tanka/答题插件开发/interview-forge-archive' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          sessionId: { type: 'string' },
          title: { type: 'string' },
          totalQuestions: { type: 'integer' },
          quizPath: { type: 'string' },
          ownerSessionId: { type: 'string' },
        },
      },
      render(args, value) {
        return [{ type: 'text', text: '练习已启动：「' + value.title + '」（共 ' + value.totalQuestions + ' 题）。sessionId=' + value.sessionId + '，题库已写入 ' + value.quizPath + '。点击 Web 右下角「⚡」速练浮层打开答题队列，点击该项即可开始答题；提交后会自动跳转会话语发送「答完了」。' }]
      },
    },
    async execute(args, exec) {
      const fs = ctx.get('fs')
      if (!fs) throw new Error('fs 服务不可用，无法保存题库')
      const quiz = args.quiz
      if (!quiz || typeof quiz !== 'object' || !quiz.meta || !Array.isArray(quiz.questions) || quiz.questions.length < 1) {
        throw new Error('quiz 参数不符合 quiz.schema.json：需要 { meta: {...}, questions: [...] }')
      }
      const archiveDir = String(args.archiveDir || '').replace(/\/+$/, '')
      if (!archiveDir) throw new Error('缺少 archiveDir 参数')
      const ownerSessionId = String((exec && exec.agent && exec.agent.sessionId) || '')
      store.lastArchiveDir = archiveDir
      if (exec && exec.agent && exec.agent.session && exec.agent.session.header) store.lastWorkspace = exec.agent.session.header.cwd || null
      const sessionId = stamp()
      const date = dateDir()
      const quizPath = archiveDir + '/sessions/' + date + '/quiz-' + sessionId + '.json'
      const resultPath = archiveDir + '/sessions/' + date + '/result-' + sessionId + '.json'
      await fs.writeText(await fs.resolve(quizPath), JSON.stringify(quiz, null, 2))
      const entry = {
        sessionId, quiz, archiveDir, quizPath, resultPath,
        status: 'answering', startedAt: Date.now(), result: null, reportHtml: null,
        ownerSessionId, progress: freshProgress(),
      }
      store.sessions.set(sessionId, entry)
      store.order.push(sessionId)
      return { sessionId, title: quiz.meta.title, totalQuestions: quiz.questions.length, quizPath, ownerSessionId }
    },
  })

  // ---- 工具 2：登记报告就绪 ----
  const reportTool = defineTool({
    name: 'forge_report_ready',
    description: '通知插件某组练习的反馈报告已生成：读取 reportPath 的 HTML 存入条目并标记为报告就绪，用户可在右下角速练队列点击查看报告。Agent 在用 render-report.cjs 渲染出 report-*.html 后调用。',
    parameters: {
      sessionId: { type: 'string', required: true, description: '练习会话 ID（forge_start 返回值）' },
      reportPath: { type: 'string', required: true, description: 'report-*.html 的绝对路径' },
    },
    output: {
      schema: { type: 'object', additionalProperties: true, properties: { ok: { type: 'boolean' } } },
      render(args, value) {
        return [{ type: 'text', text: value.ok ? '报告已就绪，用户可在右下角速练队列查看。' : '报告登记失败：' + String(value.error || '未知错误') }]
      },
    },
    async execute(args, exec) {
      let entry = store.findEntry(String(args.sessionId))
      if (!entry && ctx.get('fs')) entry = await hydrateEntry(ctx, String(args.sessionId)) // 重启后磁盘兜底
      if (!entry) throw new Error('未知的 sessionId: ' + args.sessionId)
      const fs = ctx.get('fs')
      if (!fs) throw new Error('fs 服务不可用')
      const html = await fs.readText(await fs.resolve(args.reportPath))
      entry.reportHtml = html
      entry.status = 'reported'
      return { ok: true, sessionId: entry.sessionId }
    },
  })

  // ---- 工具 3：获取结果 ----
  const resultTool = defineTool({
    name: 'forge_result',
    description: '获取练习结果与题库（默认最新一组，可指定 sessionId），用于交叉检验与反馈报告生成。用户说「答完了/练习完成/出反馈/出报告」时调用。',
    parameters: {
      sessionId: { type: 'string', description: '可选；缺省返回最新一组会话' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: true,
        properties: { found: { type: 'boolean' }, sessionId: { type: 'string' }, title: { type: 'string' }, status: { type: 'string' } },
      },
      render(args, value) {
        if (!value.found) return [{ type: 'text', text: '未找到练习会话，请先运行 forge_start。' }]
        const statusText = value.status === 'submitted' || value.status === 'reported' ? '答题已完成，可基于 result JSON 做交叉检验与归因' : '答题尚未提交'
        return [{ type: 'text', text: '已读取「' + value.title + '」（' + value.sessionId + '），状态：' + statusText + '。' }]
      },
    },
    async execute(args, exec) {
      // 内存优先，重启后内存为空则走磁盘兜底（discoverRoots + hydrateEntry），与浮层路径一致
      let entry = args && args.sessionId ? store.findEntry(String(args.sessionId)) : store.latestEntry()
      if (!entry && ctx.get('fs')) {
        entry = args && args.sessionId
          ? await hydrateEntry(ctx, String(args.sessionId))
          : await resolveLatestEntry(ctx)
      }
      if (!entry) return { found: false }
      return {
        found: true,
        sessionId: entry.sessionId,
        title: entry.quiz.meta.title,
        status: entry.status,
        quiz: entry.quiz,
        result: entry.result,
        quizPath: entry.quizPath,
        resultPath: entry.resultPath,
      }
    },
  })

  // 注册工具（随插件 unload 自动回滚）
  ctx.tools.register(startTool)
  ctx.tools.register(reportTool)
  ctx.tools.register(resultTool)

  // 配套 skill 挂载：把包内 skill/ 目录注册为宿主 SkillProvider。
  // skills 服务由 web-app bundle 的基础 skill registry 行提供；缺失时跳过（不阻塞工具）。
  try {
    if (ctx.skills && typeof ctx.skills.registerProvider === 'function') {
      ctx.skills.registerProvider(() => forgeSkillProvider)
    } else {
      console.warn('[interview-forge] ctx.skills 不可用，配套 skill 未挂载（工具仍可用）')
    }
  } catch (e) {
    console.warn('[interview-forge] skill provider 注册失败：' + (e && e.message))
  }

  // host 跨端服务（TypertRemoteService 'forge'）：供 client 半边 remote.forge.* 调用。
  ctx.plugin(ForgeGateway)

  // 共享 store 的宿主侧挂接（client 数据通路 + 磁盘扫描恢复）
  store._ctx = ctx
  store._workspaceFromSid = (sid) => workspaceFromCtxSessions(ctx, sid)
  store._scanArchive = (roots, year, month) => { const fs = ctx.get('fs'); return fs ? scanArchive(fs, roots, year, month) : Promise.resolve([]) }

  console.log('[interview-forge] host plugin active (standard bundle), sessions=' + store.sessions.size)
  return store
}
