// InterviewForge 速练 — client 半边完整交互版
// 队列(⚡FAB) → 打开答题(load/snapshot轮询) → 提交answer → 完成finish → 报告report
import * as React from 'react'
import type { Context } from '@deepseek-ai/cordis'
import { ForgeRemoteContribution } from './forge-remote'

export const inject = ['slots', 'remote']
// 注意：不要在这里声明 'remote.forge'（自等死锁）；apply 内先 await $mount 再取用。

type ForgeRpc = {
  list(): Promise<{ entries: ForgeEntry[] }>
  history(): Promise<{ days: HistoryDay[] }>
  load(args: { sessionId: string }): Promise<{ sessionId: string; quiz: { meta: { title: string }; questions: Q[] }; status: string; progress: { currentIndex: number; answers: Record<string, unknown> } } | null>
  snapshot(args: { sessionId: string }): Promise<{ status: string; started: boolean; currentIndex: number; answers: Record<string, unknown>; elapsedGlobal: number; elapsedQuestion: number } | null>
  applySeed(args: { sessionId: string }): Promise<{ ok: boolean }>
  answer(args: { sessionId: string; questionId: string; selected?: string | null; note?: string | null }): Promise<{ ok: boolean }>
  nav(args: { sessionId: string; index: number }): Promise<{ ok: boolean }>
  pause(args: { sessionId: string }): Promise<{ ok: boolean }>
  resume(args: { sessionId: string }): Promise<{ ok: boolean }>
  finish(args: { sessionId: string }): Promise<{ ok: boolean }>
  report(args: { sessionId: string }): Promise<{ reportHtml: string | null }>
}
interface ForgeEntry { sessionId: string; title: string; totalQuestions: number; status: string }
interface HistoryEntry { sessionId: string; title: string; totalQuestions: number; status: string; correctCount?: number | null; accuracy?: number | null; durationMs?: number | null }
interface HistoryDay { year: number; month: number; day: number; entries: HistoryEntry[] }
interface Q { id: string; type: string; stem: string; options?: { key: string; text: string }[]; answer?: string; explanation?: string }

function h(type: unknown, props: unknown | null, ...children: React.ReactNode[]): React.ReactElement {
  return React.createElement(type as never, props as never, ...children)
}

const CSS = [
  // 颜色全部走 DSW 主题令牌（定义在 body 上，随 body[data-ds-dark-theme] 翻转），
  // 浅色回退值 = 原硬编码色，令牌缺失时外观不变。
  '.forge-panel{position:fixed;right:22px;bottom:88px;width:330px;max-height:62vh;background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-label-primary,#1c1c22);border:1px solid var(--dsw-alias-border-l2,#d9dae2);border-radius:12px;box-shadow:0 10px 34px rgba(0,0,0,.12);z-index:1290;display:flex;flex-direction:column;overflow:hidden}',
  '.forge-panel-head{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-bottom:1px solid var(--dsw-alias-border-l1,#eee);font-weight:600;font-size:14px}',
  '.forge-list{overflow-y:auto;padding:8px;display:flex;flex-direction:column;gap:8px}',
  '.forge-item{display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--dsw-alias-bg-module-platform,#f2f3f7);border:1px solid var(--dsw-alias-border-l2,#e8e9ef);border-radius:10px;cursor:pointer}',
  '.forge-item:hover{border-color:var(--dsw-alias-border-l4,#b9bac8)}',
  '.forge-item .t{flex:1;min-width:0;font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
  '.forge-item .s{font-size:11px;color:var(--dsw-alias-label-tertiary,#8b8b9a);margin-top:2px}',
  '.forge-badge{font-size:11px;font-weight:600;padding:2px 8px;border-radius:10px;flex-shrink:0}',
  '.b-answering{background:#2f6bff22;color:var(--dsw-alias-brand-primary-new-colorprimary-new-color,#2f6bff)}.b-reported{background:#1f9d5522;color:var(--dsw-alias-state-success-primary,#1f9d55)}.b-done{background:#d99a0022;color:var(--dsw-alias-state-warn-primary,#d99a00)}',
  '.forge-modal{position:fixed;inset:0;background:var(--dsw-alias-bg-mask-1,rgba(0,0,0,.48));z-index:1400;display:flex;align-items:center;justify-content:center}',
  '.forge-card{width:min(760px,94vw);height:min(88vh,900px);background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-label-primary,#1c1c22);border-radius:16px;display:flex;flex-direction:column;overflow:hidden}',
  '.forge-card-head{display:flex;justify-content:space-between;align-items:center;padding:12px 20px;border-bottom:1px solid var(--dsw-alias-border-l1,#eee);font-size:13px;color:var(--dsw-alias-label-secondary,#565664);flex-shrink:0}',
  '.forge-body{flex:1;overflow:auto;padding:20px 24px}',
  '.forge-q{padding:16px 20px;background:var(--dsw-alias-bg-module-platform,#f2f3f7);border:1px solid var(--dsw-alias-border-l2,#e8e9ef);border-radius:12px;margin-bottom:6px}',
  '.forge-type{display:inline-block;padding:2px 10px;border-radius:4px;font-size:12px;font-weight:700;margin-bottom:12px}',
  '.forge-t-choice{background:var(--dsw-alias-state-warn-primary,#d99a00);color:#fff}.forge-t-open{background:var(--dsw-alias-state-success-primary,#1f9d55);color:#fff}',
  '.forge-stem{font-size:16px;font-weight:600;line-height:1.7;white-space:pre-wrap}',
  '.forge-opt{display:flex;gap:12px;padding:12px 14px;background:var(--dsw-specific-input-major,var(--dsw-alias-bg-base,#fff));border:2px solid var(--dsw-alias-border-l2,#d9dae2);border-radius:10px;cursor:pointer;margin-top:8px}',
  '.forge-opt.sel{border-color:var(--dsw-alias-brand-primary-new-colorprimary-new-color,#2f6bff);background:#2f6bff14}',
  '.forge-opt .k{width:24px;height:24px;border-radius:50%;background:var(--dsw-alias-bg-module-platform,#e8e9ef);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0}',
  '.forge-txt{width:100%;box-sizing:border-box;min-height:120px;margin-top:12px;padding:12px;background:var(--dsw-specific-input-major,var(--dsw-alias-bg-base,#fff));color:var(--dsw-alias-label-primary,#1c1c22);border:1px solid var(--dsw-alias-border-l2,#d9dae2);border-radius:10px;font-size:14px;line-height:1.7;resize:vertical}',
  '.forge-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:16px}',
  // 几何防线：我们渲染的所有表面统一 border-box，杜绝 width:100%+padding 按content-box溢出容器
  '.forge-panel *,.forge-card *{box-sizing:border-box}',
  '.forge-btn{padding:9px 18px;border:1px solid var(--dsw-alias-border-l2,#d9dae2);border-radius:8px;font-size:14px;cursor:pointer;background:var(--dsw-alias-button-elevated-fill,var(--dsw-alias-bg-base,#fff));color:var(--dsw-alias-label-primary,#1c1c22)}',
  '.forge-btn.primary{background:var(--dsw-alias-brand-primary-new-colorprimary-new-color,#2f6bff);border-color:transparent;color:#fff;font-weight:600}',
  '.forge-btn.accent{background:var(--dsw-alias-state-success-primary,#1f9d55);border-color:transparent;color:#fff;font-weight:600}',
  '.forge-empty{color:var(--dsw-alias-label-tertiary,#8b8b9a);font-size:13px;text-align:center;padding:18px 10px}',
  '.forge-fab{position:fixed;right:22px;bottom:22px;width:56px;height:56px;border-radius:50%;border:none;background:var(--dsw-alias-brand-primary-new-colorprimary-new-color,#2f6bff);color:#fff;font-size:22px;cursor:pointer;box-shadow:0 6px 20px color-mix(in srgb,var(--dsw-alias-brand-primary-new-colorprimary-new-color,#2f6bff) 45%,transparent);z-index:1300;display:flex;align-items:center;justify-content:center;pointer-events:auto;transition:transform .15s}',
  '.forge-fab:hover{transform:scale(1.06)}',
  '.forge-fab-badge{position:absolute;top:-4px;right:-4px;min-width:20px;height:20px;border-radius:10px;background:var(--dsw-alias-state-error-primary,#d93045);color:var(--dsw-alias-bg-base,#fff);font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 5px;border:2px solid var(--dsw-alias-bg-base,#fff)}',
  // ---- 历史 dashboard（月历 + 当日列表） ----
  '.forge-hist-card{width:min(560px,94vw);height:auto;max-height:min(86vh,860px)}',
  '.forge-cal-nav{display:flex;align-items:center;gap:10px;margin-bottom:10px}',
  '.forge-cal-title{flex:1;text-align:center;font-weight:600;font-size:14px}',
  '.forge-cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}',
  '.forge-cal-dow{font-size:11px;color:var(--dsw-alias-label-tertiary,#8b8b9a);text-align:center;padding:2px 0 6px;font-weight:600}',
  '.forge-cal-cell{position:relative;height:46px;background:var(--dsw-alias-bg-module-platform,#f2f3f7);border:1px solid var(--dsw-alias-border-l2,#e8e9ef);border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:13px;color:var(--dsw-alias-label-secondary,#565664);cursor:pointer}',
  '.forge-cal-cell:hover{border-color:var(--dsw-alias-border-l4,#b9bac8)}',
  '.forge-cal-cell.empty{background:transparent;border:none;cursor:default}',
  '.forge-cal-cell.has{background:#2f6bff0d;border-color:var(--dsw-alias-brand-primary-new-colorprimary-new-color,#b9cffd);color:var(--dsw-alias-brand-primary-new-colorprimary-new-color,#2f6bff);font-weight:700}',
  '.forge-cal-cell.sel{border-color:var(--dsw-alias-brand-primary-new-colorprimary-new-color,#2f6bff);background:#2f6bff1a;box-shadow:0 0 0 1px #2f6bff66}',
  '.forge-cal-cell.today::after{content:"";position:absolute;bottom:4px;left:50%;transform:translateX(-50%);width:5px;height:5px;border-radius:50%;background:var(--dsw-alias-state-success-primary,#1f9d55)}',
  '.forge-cal-count{position:absolute;top:3px;right:5px;font-size:10px;line-height:1.2;font-weight:700;color:var(--dsw-alias-brand-primary-new-colorprimary-new-color,#2f6bff)}',
  '.forge-sum{display:flex;gap:16px;flex-wrap:wrap;padding:9px 12px;background:var(--dsw-alias-bg-module-platform,#f6f7fb);border:1px solid var(--dsw-alias-border-l2,#e8e9ef);border-radius:10px;font-size:12px;color:var(--dsw-alias-label-secondary,#565664);margin-top:12px}',
  '.forge-sum b{color:var(--dsw-alias-brand-primary-new-colorprimary-new-color,#2f6bff);font-weight:700}',
  '.forge-hist-list{display:flex;flex-direction:column;gap:8px;margin-top:12px}',
  '.forge-hist-item{display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--dsw-alias-bg-module-platform,#f2f3f7);border:1px solid var(--dsw-alias-border-l2,#e8e9ef);border-radius:10px;cursor:pointer}',
  '.forge-hist-item:hover{border-color:var(--dsw-alias-border-l4,#b9bac8)}',
  '.forge-hist-info{flex:1;min-width:0}',
  '.forge-hist-title{font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
  '.forge-hist-sub{font-size:11px;color:var(--dsw-alias-label-tertiary,#8b8b9a);margin-top:2px}',
].join('\n')

// ---- 可量化诊断：window.__FORGE_DIAG__ 记录模块执行各步骤（E2E 与现场排查用） ----
const DIAG: { start: number; steps: { t: number; name: string; extra?: string }[]; fatal?: string } = { start: Date.now(), steps: [] }
try { (window as unknown as { __FORGE_DIAG__: unknown }).__FORGE_DIAG__ = DIAG } catch { /* noop */ }
/** 解包 server-response 信封：{ok,value}→value；ok:false 转 reject（E2E 实测 SDK 不解包）。 */
function unwrapEnvelope<T>(v: T): T {
  if (v && typeof v === 'object' && 'ok' in (v as Record<string, unknown>)) {
    const env = v as unknown as { ok: boolean; value?: unknown; error?: { message?: string } }
    if (env.ok === false) throw new Error(env.error?.message || 'forge RPC 返回失败')
    return env.value as T
  }
  return v
}

function dstep(name: string, extra?: string): void {
  DIAG.steps.push({ t: Date.now() - DIAG.start, name, extra })
  if (DIAG.steps.length > 80) DIAG.steps.splice(0, DIAG.steps.length - 80)
  try { (window as unknown as { __FORGE_DIAG__: unknown }).__FORGE_DIAG__ = DIAG; console.info('[forge-diag]', name, extra ?? '') } catch { /* noop */ }
}

export async function apply(ctx: Context): Promise<void> {
  dstep('apply:enter')
  // 注入 CSS
  try {
    const style = document.createElement('style')
    style.textContent = CSS
    document.head.appendChild(style)
  } catch { /* no-op */ }

  const remote = ctx.get('remote') as unknown as { $mount(c: unknown): Promise<unknown> }
  try { await remote.$mount(ForgeRemoteContribution); dstep('mount:ok') } catch (e) { dstep('mount:fail', String(e)); DIAG.fatal = 'mount: ' + String(e) }
  // 必须用点分键取命名空间：cordis 的 traceable 代理对“未声明注入的嵌套属性”会拦截
  // （报 cannot get property "remote.forge" without inject）。
  // (ctx.get('remote')).forge 就是这种嵌套属性访问 —— 服务已注册也会被门禁拦下；
  // 而 ctx.get('remote.forge') 直接读服务注册表，服务存在即放行。
  const forgeRpcRaw = ctx.get('remote.forge') as unknown as ForgeRpc
  // SDK 返回的是完整信封（见 unwrapEnvelope 注释），这里对方法统一解包。
  // 防御式 Proxy：symbol/非函数属性原样透传（React 内部探测不可当方法调用，否则 slot 树崩溃）。
  const forgeRpc = new Proxy({} as ForgeRpc, {
    get(_t, m: string | symbol) {
      if (typeof m === 'symbol') return undefined
      const fn = (forgeRpcRaw as unknown as Record<string, unknown>)[m]
      if (typeof fn !== 'function') return fn
      return (...args: unknown[]) =>
        (fn as (...a: unknown[]) => Promise<unknown>).apply(forgeRpcRaw, args).then(unwrapEnvelope)
    },
  })
  dstep('rpc:namespace-ready')

  const slots = ctx.get('slots') as unknown as {
    inject(name: string, fn: () => unknown): unknown
    register(spec: unknown, render: (props: unknown) => React.ReactElement): unknown
  }

  function fabView(): React.ReactElement {
    const [open, setOpen] = React.useState(false)
    const [entries, setEntries] = React.useState<ForgeEntry[]>([])
    const [err, setErr] = React.useState('')
    const [quizView, setQuizView] = React.useState<{ sessionId: string } | null>(null)
    const [reportView, setReportView] = React.useState<{ sessionId: string; title: string } | null>(null)
    const [histOpen, setHistOpen] = React.useState(false)
    const refresh = () => { forgeRpc.list().then((d) => { setErr(''); const n = (d && d.entries) || []; setEntries(n); dstep('list:ok', 'entries=' + n.length + ' raw=' + (d ? JSON.stringify(d).slice(0, 140) : 'RESOLVED_NULL')) }).catch((e) => { const m = String(e && e.message || e); setErr(m); dstep('list:err', m) }) }
    React.useEffect(() => { refresh(); const iv = window.setInterval(refresh, 3000); return () => window.clearInterval(iv) }, [])

    const panel = open
      ? h('div', { className: 'forge-panel' },
          h('div', { className: 'forge-panel-head' },
            h('span', null, '⚡ InterviewForge 速练'),
            h('div', { style: { display: 'flex', gap: 6 } },
              h('button', { className: 'forge-btn', onClick: () => { setOpen(false); setHistOpen(true) }, style: { padding: '2px 8px' }, title: '按日期查看练习历史' }, '📅 历史'),
              h('button', { className: 'forge-btn', onClick: () => setOpen(false), style: { padding: '2px 8px' } }, '收起'))),
          h('div', { className: 'forge-list' },
            err
              ? h('div', { style: { color: '#d93045', fontSize: 12, whiteSpace: 'pre-wrap', padding: '6px 2px' } }, 'LIST 错误: ' + err)
              : null,
            err === '' && entries.length === 0
              ? h('div', { className: 'forge-empty' }, '暂无练习。对 Agent 说「开始练习」即可。')
              : entries.map((e) => {
                  const cls = e.status === 'reported' ? 'b-reported' : (e.status === 'submitted' ? 'b-done' : 'b-answering')
                  const label = e.status === 'reported' ? '报告' : (e.status === 'submitted' ? '完成' : '作答中')
                  return h('div', { key: e.sessionId, className: 'forge-item', onClick: () => {
                    if (e.status === 'reported') setReportView({ sessionId: e.sessionId, title: e.title })
                    else if (e.status === 'answering') setQuizView({ sessionId: e.sessionId })
                  } },
                    h('div', { className: 't' }, e.title, h('div', { className: 's' }, e.sessionId + ' · ' + String(e.totalQuestions) + ' 题')),
                    h('span', { className: 'forge-badge ' + cls }, label))
                })))
      : null

    // 对齐动态插件 v29：角标只计「作答中」场次；图标为试卷 SVG
    const activeCount = entries.filter((e) => e.status === 'answering').length
    return h('div', null,
      h('button', { className: 'forge-fab', onClick: () => setOpen((o) => !o), title: 'InterviewForge 速练' },
        h('svg', { viewBox: '0 0 24 24', width: 26, height: 26, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
          h('path', { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' }),
          h('path', { d: 'M14 2v6h6' }),
          h('path', { d: 'm9 15 2 2 4-4' })),
        activeCount > 0 ? h('span', { className: 'forge-fab-badge' }, activeCount > 99 ? '99+' : String(activeCount)) : null),
      panel,
      histOpen ? h(HistoryDashboard, {
        rpc: forgeRpc,
        onClose: () => setHistOpen(false),
        onOpenReport: (sessionId: string, title: string) => { setHistOpen(false); setReportView({ sessionId, title }) },
        onOpenQuiz: (sessionId: string) => { setHistOpen(false); setQuizView({ sessionId }) },
      }) : null,
      quizView ? h(QuizRunner, { rpc: forgeRpc, sessionId: quizView.sessionId, onClose: () => { setQuizView(null); refresh() } }) : null,
      reportView ? h(ReportView, { rpc: forgeRpc, sessionId: reportView.sessionId, title: reportView.title, onClose: () => { setReportView(null); refresh() } }) : null)
  }

  function QuizRunner(props: { rpc: ForgeRpc; sessionId: string; onClose: () => void }): React.ReactElement {
    const [quiz, setQuiz] = React.useState<{ meta: { title: string }; questions: Q[] } | null>(null)
    const [view, setView] = React.useState<{ status: string; currentIndex: number; answers: Record<string, unknown>; elapsedGlobal: number; elapsedQuestion: number } | null>(null)
    const [selected, setSelected] = React.useState('')
    const [note, setNote] = React.useState('')
    const [clientElapsedGlobal, setClientElapsedGlobal] = React.useState(0)
    const [clientElapsedQuestion, setClientElapsedQuestion] = React.useState(0)
    const globalStartRef = React.useRef<number>(Date.now())
    const questionStartRef = React.useRef<number>(Date.now())
    // ---- 草稿簿：按题键控的本地真值。切题/收起/卸载先落盘再恢复，杜绝串台与丢字 ----
    const draftsRef = React.useRef<Record<string, { selected: string; note: string }>>({})
    const inputQidRef = React.useRef<string>('')
    const saveTimerRef = React.useRef<number | null>(null)
    const currentQid = quiz && view ? (quiz.questions[view.currentIndex]?.id || '') : ''
    const flushDraft = (qid?: string) => {
      const target = qid || inputQidRef.current
      if (saveTimerRef.current) { window.clearTimeout(saveTimerRef.current); saveTimerRef.current = null }
      const d = draftsRef.current[target]
      if (!target || !d || (!d.selected && !d.note)) return
      props.rpc.answer({ sessionId: props.sessionId, questionId: target, selected: d.selected || null, note: d.note || null }).catch(() => {})
    }
    const scheduleDraftSave = () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
      saveTimerRef.current = window.setTimeout(() => flushDraft(), 400)
    }
    const updateSelected = (v: string) => {
      setSelected(v)
      const qid = inputQidRef.current
      draftsRef.current[qid] = { selected: v, note: (draftsRef.current[qid] || { selected: '', note: '' }).note }
      scheduleDraftSave()
    }
    const updateNote = (v: string) => {
      setNote(v)
      const qid = inputQidRef.current
      draftsRef.current[qid] = { selected: (draftsRef.current[qid] || { selected: '', note: '' }).selected, note: v }
      scheduleDraftSave()
    }
    // 切题：先把旧题草稿落盘，再恢复新题（本地草稿优先，宿主 answers 兜底）
    React.useEffect(() => {
      if (!currentQid) return
      if (inputQidRef.current === currentQid) return
      flushDraft()
      inputQidRef.current = currentQid
      const stored = (view?.answers as Record<string, { selected?: string; note?: string }> | undefined)?.[currentQid]
      const restored = {
        selected: draftsRef.current[currentQid]?.selected || stored?.selected || '',
        note: draftsRef.current[currentQid]?.note || stored?.note || '',
      }
      draftsRef.current[currentQid] = restored
      setSelected(restored.selected)
      setNote(restored.note)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentQid, view?.answers])
    // 卸载兜底：收起 / 关闭 / 切场次都会触发，防抖窗口内的草稿不丢
    React.useEffect(() => () => flushDraft(), [])
    React.useEffect(() => {
      // v29 对齐：openQuiz 即 forge.resume —— 首次开题启动计时，收起后重开恢复计时
      props.rpc.resume({ sessionId: props.sessionId }).catch(() => {})
      props.rpc.applySeed({ sessionId: props.sessionId }).catch(() => {})
      props.rpc.load({ sessionId: props.sessionId }).then((d) => { if (d && d.quiz) setQuiz(d.quiz) }).catch(() => {})
      const poll = () => { props.rpc.snapshot({ sessionId: props.sessionId }).then((d) => { if (d) setView(d) }).catch(() => {}) }
      poll()
      const iv = window.setInterval(poll, 1000)
      return () => window.clearInterval(iv)
    }, [props.sessionId])

    // 客户端计时器兜底，确保计时器始终运转
    React.useEffect(() => {
      const timer = window.setInterval(() => {
        setClientElapsedGlobal(Math.floor((Date.now() - globalStartRef.current) / 1000))
        setClientElapsedQuestion(Math.floor((Date.now() - questionStartRef.current) / 1000))
      }, 1000)
      return () => window.clearInterval(timer)
    }, [])

    // 题切换时重置本题计时起点
    React.useEffect(() => {
      questionStartRef.current = Date.now() - (view?.elapsedQuestion ? view.elapsedQuestion * 1000 : 0)
    }, [view?.currentIndex, view?.elapsedQuestion])

    // 恢复全局计时起点，避免收起后重开归零
    React.useEffect(() => {
      if (view?.elapsedGlobal != null) {
        globalStartRef.current = Date.now() - view.elapsedGlobal * 1000
      }
    }, [view?.elapsedGlobal])

    if (!quiz || !view) return h('div', { className: 'forge-modal' }, h('div', { className: 'forge-card' }, h('div', { className: 'forge-empty' }, '加载中…')))
    if (view.status !== 'answering') {
      return h('div', { className: 'forge-modal' },
        h('div', { className: 'forge-card' },
          h('div', { className: 'forge-card-head' }, h('span', null, '✅ 练习完成 · ' + quiz.meta.title), h('button', { className: 'forge-btn', onClick: props.onClose }, '关闭')),
          h('div', { className: 'forge-body' }, h('div', { className: 'forge-empty' }, '本组练习已提交，等待生成交叉检验与反馈报告。'))))
    }
    const q = quiz.questions[view.currentIndex]
    const isLast = view.currentIndex >= quiz.questions.length - 1
    const isChoice = q.type === 'choice'
    const canSubmit = isChoice ? !!(selected && note.trim()) : !!note.trim()
    const fmt = (s: number) => {
      const m = Math.floor(s/60); const sec = s%60; return String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0')
    }
    const pollNow = () => { props.rpc.snapshot({ sessionId: props.sessionId }).then((d) => { if (d) setView(d) }).catch(() => {}) }
    const submit = () => {
      if (!canSubmit) return
      flushDraft() // 立即落盘当前题（不走防抖）
      if (isLast) props.rpc.finish({ sessionId: props.sessionId }).then(() => { pollNow() }).catch(() => {})
      else props.rpc.nav({ sessionId: props.sessionId, index: view.currentIndex + 1 }).then(pollNow).catch(() => {})
    }
    return h('div', { className: 'forge-modal' },
      h('div', { className: 'forge-card' },
        h('div', { className: 'forge-card-head' },
          h('span', null, '⚡ ' + quiz.meta.title + ' · 第 ' + (view.currentIndex + 1) + '/' + quiz.questions.length + ' 题'),
          h('span', { style: { marginLeft: 12, fontSize: 12, opacity: 0.7 } }, '总 ' + fmt(view.elapsedGlobal || clientElapsedGlobal) + ' | 本题 ' + fmt((view.elapsedQuestion || 0) || clientElapsedQuestion)),
          h('button', { className: 'forge-btn', onClick: () => { props.rpc.pause({ sessionId: props.sessionId }).catch(() => {}); props.onClose() } }, '收起')),
        h('div', { className: 'forge-body' },
          h('div', { className: 'forge-q' },
            h('span', { className: 'forge-type ' + (isChoice ? 'forge-t-choice' : 'forge-t-open') }, isChoice ? '选择题' : '开放题'),
            h('div', { className: 'forge-stem' }, q.stem),
            isChoice && q.options
              ? h('div', null, q.options.map((o) =>
                  h('div', { key: o.key, className: 'forge-opt' + (selected === o.key ? ' sel' : ''), onClick: () => updateSelected(o.key) },
                    h('span', { className: 'k' }, o.key), h('span', null, o.text))))
              : null,
            h('textarea', { className: 'forge-txt', value: note, placeholder: isChoice ? '写出你选择这个答案的理由…' : '请详细作答…', onChange: (e: { target: { value: string } }) => updateNote(e.target.value) }),
            h('div', { className: 'forge-actions' },
              view.currentIndex > 0 ? h('button', { className: 'forge-btn', onClick: () => props.rpc.nav({ sessionId: props.sessionId, index: view.currentIndex - 1 }).then(pollNow).catch(() => {}) }, '← 上一题') : null,
              h('button', { className: 'forge-btn accent', disabled: !canSubmit, onClick: submit }, isLast ? '完成练习' : '提交并下一题'))))))
  }

  // ---- 主题同步：读 body 上的 DSW 令牌（随 body[data-ds-dark-theme] 翻转） ----
  function resolveVar(name: string, fallback: string): string {
    try {
      const v = getComputedStyle(document.body).getPropertyValue(name).trim()
      return v || fallback
    } catch { return fallback }
  }
  /** 把当前主题解析为 --rpt-* 注入报告 HTML（对齐 v29 themeReportHtml）。
   *  模板自带深蓝 :root 默认值，故用 !important 保证应用主题覆盖它。
   *  基底色取自 DSW 令牌；强调色/风险块底色按当前模式选可读配色。 */
  function themeReportHtml(html: string): string {
    let dark = false
    try { dark = document.body.hasAttribute('data-ds-dark-theme') } catch { /* noop */ }
    const acc = dark
      ? { green: '#66bb6a', red: '#ef5350', orange: '#ffa726', blue: '#42a5f5', purple: '#ab47bc', riskBg: '#2a1a1a', warnBg: '#2a2a1a', safeBg: '#1a2a1a' }
      : { green: '#2e7d32', red: '#c62828', orange: '#e65100', blue: '#1565c0', purple: '#6a1b9a', riskBg: '#fdecea', warnBg: '#fdf3e0', safeBg: '#e8f5e9' }
    const bg = resolveVar('--dsw-alias-bg-base', '#ffffff')
    const text = resolveVar('--dsw-alias-label-primary', '#1c1c22')
    const secondary = resolveVar('--dsw-alias-label-secondary', '#565664')
    const card = resolveVar('--dsw-alias-bg-module-platform', '#f2f3f7')
    const border = resolveVar('--dsw-alias-border-l2', '#d9dae2')
    const brand = resolveVar('--dsw-alias-brand-primary-new-colorprimary-new-color', '#2f6bff')
    const css = ':root{'
      + `--rpt-bg:${bg} !important;`
      + `--rpt-text:${text} !important;`
      + `--rpt-title:${brand} !important;`
      + `--rpt-h2:${brand} !important;`
      + `--rpt-h3:${text} !important;`
      + `--rpt-meta:${secondary} !important;`
      + `--rpt-card:${card} !important;`
      + `--rpt-card-border:${border} !important;`
      + `--rpt-bar:${border} !important;`
      + `--rpt-qa:${card} !important;`
      + `--rpt-sub:${secondary} !important;`
      + `--rpt-risk-bg:${acc.riskBg} !important;`
      + `--rpt-warn-bg:${acc.warnBg} !important;`
      + `--rpt-safe-bg:${acc.safeBg} !important;`
      + `--rpt-green:${acc.green} !important;`
      + `--rpt-red:${acc.red} !important;`
      + `--rpt-orange:${acc.orange} !important;`
      + `--rpt-blue:${acc.blue} !important;`
      + `--rpt-purple:${acc.purple} !important}`
    return html.replace('<style>', '<style>' + css)
  }

  function ReportView(props: { rpc: ForgeRpc; sessionId: string; title: string; onClose: () => void }): React.ReactElement {
    const [html, setHtml] = React.useState<string | null>(null)
    const [themeTick, setThemeTick] = React.useState(0)
    React.useEffect(() => { props.rpc.report({ sessionId: props.sessionId }).then((d) => setHtml((d && d.reportHtml) || null)).catch(() => setHtml(null)) }, [props.sessionId])
    // 跟随 web 端深浅切换：观察 body 的 data-ds-dark-theme 属性变化，重解析并重载 iframe。
    React.useEffect(() => {
      const ob = new MutationObserver(() => setThemeTick((n) => n + 1))
      try { ob.observe(document.body, { attributes: true, attributeFilter: ['data-ds-dark-theme'] }) } catch { /* noop */ }
      return () => ob.disconnect()
    }, [])
    const themed = html ? themeReportHtml(html) : null
    return h('div', { className: 'forge-modal' },
      h('div', { className: 'forge-card' },
        h('div', { className: 'forge-card-head' }, h('span', null, '📊 反馈报告 · ' + props.title), h('button', { className: 'forge-btn', onClick: props.onClose }, '✕ 关闭')),
        themed
          ? h('iframe', { key: themeTick, style: { flex: 1, border: 'none', width: '100%', height: '100%' }, srcDoc: themed, sandbox: 'allow-scripts' })
          : h('div', { className: 'forge-empty' }, '报告尚未生成或读取失败')))
  }

  // ---- 历史 dashboard：月历按日期浏览全部练习（对齐动态组件 v29 的「📅 练习历史」并增强） ----
  function fmtDuration(ms: number | null | undefined): string {
    if (ms == null || !(ms > 0)) return ''
    const s = Math.floor(ms / 1000)
    if (s < 60) return s + ' 秒'
    const m = Math.floor(s / 60)
    if (m < 60) return m + ' 分 ' + (s % 60) + ' 秒'
    return Math.floor(m / 60) + ' 小时 ' + (m % 60) + ' 分'
  }
  function statusBadge(status: string): { cls: string; label: string } {
    if (status === 'reported') return { cls: 'b-reported', label: '报告就绪' }
    if (status === 'submitted') return { cls: 'b-done', label: '已完成' }
    return { cls: 'b-answering', label: '进行中' }
  }

  function HistoryDashboard(props: { rpc: ForgeRpc; onClose: () => void; onOpenReport: (sessionId: string, title: string) => void; onOpenQuiz: (sessionId: string) => void }): React.ReactElement {
    const today = new Date()
    const [ym, setYm] = React.useState({ year: today.getFullYear(), month: today.getMonth() + 1 })
    const [days, setDays] = React.useState<HistoryDay[] | null>(null)
    const [loadErr, setLoadErr] = React.useState('')
    const [sel, setSel] = React.useState<number | null>(null)
    const loadHist = React.useCallback(() => {
      setLoadErr(''); setDays(null)
      // 首选 history RPC；宿主较旧（无该端点）时降级为 list() 本地分桶（无正确率/耗时）。
      props.rpc.history()
        .then((d) => setDays((d && d.days) || []))
        .catch(() => props.rpc.list().then((d) => {
          const byKey = new Map<string, HistoryDay>()
          for (const e of (d && d.entries) || []) {
            const c = e as unknown as { createdAt?: number }
            const dt = c.createdAt ? new Date(c.createdAt) : null
            if (!dt || isNaN(dt.getTime())) continue
            const key = dt.getFullYear() + '-' + dt.getMonth() + '-' + dt.getDate()
            let b = byKey.get(key)
            if (!b) { b = { year: dt.getFullYear(), month: dt.getMonth() + 1, day: dt.getDate(), entries: [] }; byKey.set(key, b) }
            b.entries.push(e)
          }
          setDays([...byKey.values()])
        }).catch((e2) => { setLoadErr(String(e2 && e2.message || e2)); setDays([]) }))
    }, [props.rpc]) // eslint-disable-line react-hooks/exhaustive-deps
    React.useEffect(() => { loadHist() }, [loadHist])

    const dayMap: Record<number, HistoryDay> = {}
    for (const b of days || []) {
      if (b.year === ym.year && b.month === ym.month) dayMap[b.day] = b
    }
    const monthEntries = Object.values(dayMap).flatMap((b) => b.entries)
    const accs = monthEntries.map((e) => e.accuracy).filter((a): a is number => a != null)
    const avgAcc = accs.length ? Math.round(accs.reduce((x, y) => x + y, 0) / accs.length) : null
    const lead = new Date(ym.year, ym.month - 1, 1).getDay()
    const total = new Date(ym.year, ym.month, 0).getDate()
    const cells: Array<number | null> = [...Array<null>(lead).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)]
    const isToday = (d: number) => d === today.getDate() && ym.year === today.getFullYear() && ym.month === today.getMonth() + 1
    const shiftMonth = (delta: number) => {
      setSel(null)
      setYm(({ year, month }) => {
        const d = new Date(year, month - 1 + delta, 1)
        return { year: d.getFullYear(), month: d.getMonth() + 1 }
      })
    }
    const selDay = sel != null ? dayMap[sel] : undefined

    return h('div', { className: 'forge-modal', onClick: (e: { target: unknown; currentTarget: unknown }) => { if (e.target === e.currentTarget) props.onClose() } },
      h('div', { className: 'forge-card forge-hist-card' },
        h('div', { className: 'forge-card-head' },
          h('span', null, '📅 练习历史'),
          h('div', { style: { display: 'flex', gap: 6 } },
            h('button', { className: 'forge-btn', onClick: loadHist, style: { padding: '2px 8px' }, title: '重新加载' }, '↻ 刷新'),
            h('button', { className: 'forge-btn', onClick: props.onClose, style: { padding: '2px 8px' } }, '✕ 关闭'))),
        h('div', { className: 'forge-body' },
          h('div', { className: 'forge-cal-nav' },
            h('button', { className: 'forge-btn', onClick: () => shiftMonth(-1), style: { padding: '2px 12px' } }, '‹'),
            h('span', { className: 'forge-cal-title' }, ym.year + ' 年 ' + ym.month + ' 月'),
            h('button', { className: 'forge-btn', onClick: () => setYm({ year: today.getFullYear(), month: today.getMonth() + 1 }), style: { padding: '2px 10px' }, title: '回到本月' }, '今天'),
            h('button', { className: 'forge-btn', onClick: () => shiftMonth(1), style: { padding: '2px 12px' } }, '›')),
          h('div', { className: 'forge-cal-grid' },
            ['日', '一', '二', '三', '四', '五', '六'].map((w) => h('div', { key: 'w' + w, className: 'forge-cal-dow' }, w)),
            cells.map((d, i) => {
              if (d == null) return h('div', { key: 'e' + i, className: 'forge-cal-cell empty' })
              const bucket = dayMap[d]
              const cls = 'forge-cal-cell' + (bucket ? ' has' : '') + (sel === d ? ' sel' : '') + (isToday(d) ? ' today' : '')
              return h('div', { key: d, className: cls, title: bucket ? bucket.entries.map((e) => e.title).join('\n') : undefined, onClick: () => setSel(sel === d ? null : d) },
                String(d),
                bucket ? h('span', { className: 'forge-cal-count' }, String(bucket.entries.length)) : null)
            })),
          h('div', { className: 'forge-sum' },
            h('span', null, '本月 ', h('b', null, String(monthEntries.length)), ' 场'),
            h('span', null, '共 ' + monthEntries.reduce((n, e) => n + (e.totalQuestions || 0), 0) + ' 题'),
            avgAcc != null ? h('span', null, '平均正确率 ' + avgAcc + '%') : null,
            h('span', null, '报告就绪 ' + monthEntries.filter((e) => e.status === 'reported').length + ' 场')),
          loadErr !== ''
            ? h('div', { style: { color: '#d93045', fontSize: 12, whiteSpace: 'pre-wrap', marginTop: 10 } }, 'HISTORY 错误: ' + loadErr)
            : null,
          days === null
            ? h('div', { className: 'forge-empty' }, '加载中…')
            : selDay
              ? h('div', { className: 'forge-hist-list' },
                  selDay.entries.map((en) => {
                    const badge = statusBadge(en.status)
                    const parts = [en.sessionId, en.totalQuestions + ' 题']
                    if (en.accuracy != null) parts.push('正确率 ' + en.accuracy + '%')
                    const dur = fmtDuration(en.durationMs)
                    if (dur) parts.push(dur)
                    return h('div', { key: en.sessionId, className: 'forge-hist-item', onClick: () => {
                      if (en.status === 'answering') props.onOpenQuiz(en.sessionId)
                      else props.onOpenReport(en.sessionId, en.title)
                    } },
                      h('div', { className: 'forge-hist-info' },
                        h('div', { className: 'forge-hist-title' }, en.title),
                        h('div', { className: 'forge-hist-sub' }, parts.join(' · '))),
                      h('span', { className: 'forge-badge ' + badge.cls }, badge.label))
                  }))
              : h('div', { className: 'forge-empty' }, days.length === 0 ? '还没有练习记录。对 Agent 说「开始练习」即可。' : '点击有数字的日期查看当日练习详情'))))
  }

  slots.inject('shell.overlay', () =>
    slots.register({ name: 'shell.overlay', id: 'forge-overlay', order: 65 }, () => h(fabView, null)))
  dstep('slot:registered')
}
