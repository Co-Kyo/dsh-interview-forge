// InterviewForge 速练 — client 半边完整交互版
// 队列(⚡FAB) → 打开答题(load/snapshot轮询) → 提交answer → 完成finish → 报告report
import * as React from 'react'
import type { Context } from '@deepseek-ai/cordis'
import { ForgeRemoteContribution } from './forge-remote'

export const inject = ['slots', 'remote']
// 注意：不要在这里声明 'remote.forge'（自等死锁）；apply 内先 await $mount 再取用。

type ForgeRpc = {
  list(): Promise<{ entries: ForgeEntry[] }>
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
interface Q { id: string; type: string; stem: string; options?: { key: string; text: string }[]; answer?: string; explanation?: string }

function h(type: unknown, props: unknown | null, ...children: React.ReactNode[]): React.ReactElement {
  return React.createElement(type as never, props as never, ...children)
}

const CSS = [
  '.forge-panel{position:fixed;right:22px;bottom:88px;width:330px;max-height:62vh;background:#fff;border:1px solid #d9dae2;border-radius:12px;box-shadow:0 10px 34px rgba(0,0,0,.12);z-index:2000;display:flex;flex-direction:column;overflow:hidden}',
  '.forge-panel-head{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-bottom:1px solid #eee;font-weight:600;font-size:14px}',
  '.forge-list{overflow-y:auto;padding:8px;display:flex;flex-direction:column;gap:8px}',
  '.forge-item{display:flex;align-items:center;gap:10px;padding:10px 12px;background:#f2f3f7;border:1px solid #e8e9ef;border-radius:10px;cursor:pointer}',
  '.forge-item:hover{border-color:#b9bac8}',
  '.forge-item .t{flex:1;min-width:0;font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
  '.forge-item .s{font-size:11px;color:#8b8b9a;margin-top:2px}',
  '.forge-badge{font-size:11px;font-weight:600;padding:2px 8px;border-radius:10px;flex-shrink:0}',
  '.b-answering{background:#2f6bff22;color:#2f6bff}.b-reported{background:#1f9d5522;color:#1f9d55}.b-done{background:#d99a0022;color:#d99a00}',
  '.forge-modal{position:fixed;inset:0;background:rgba(0,0,0,.48);z-index:2100;display:flex;align-items:center;justify-content:center}',
  '.forge-card{width:min(760px,94vw);height:min(88vh,900px);background:#fff;border-radius:16px;display:flex;flex-direction:column;overflow:hidden}',
  '.forge-card-head{display:flex;justify-content:space-between;align-items:center;padding:12px 20px;border-bottom:1px solid #eee;font-size:13px;color:#565664;flex-shrink:0}',
  '.forge-body{flex:1;overflow:auto;padding:20px 24px}',
  '.forge-q{padding:16px 20px;background:#f2f3f7;border:1px solid #e8e9ef;border-radius:12px;margin-bottom:6px}',
  '.forge-type{display:inline-block;padding:2px 10px;border-radius:4px;font-size:12px;font-weight:700;margin-bottom:12px}',
  '.forge-t-choice{background:#d99a00;color:#fff}.forge-t-open{background:#1f9d55;color:#fff}',
  '.forge-stem{font-size:16px;font-weight:600;line-height:1.7;white-space:pre-wrap}',
  '.forge-opt{display:flex;gap:12px;padding:12px 14px;background:#fff;border:2px solid #d9dae2;border-radius:10px;cursor:pointer;margin-top:8px}',
  '.forge-opt.sel{border-color:#2f6bff;background:#2f6bff14}',
  '.forge-opt .k{width:24px;height:24px;border-radius:50%;background:#e8e9ef;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0}',
  '.forge-txt{width:100%;min-height:120px;margin-top:12px;padding:12px;border:1px solid #d9dae2;border-radius:10px;font-size:14px;line-height:1.7;resize:vertical}',
  '.forge-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:16px}',
  '.forge-btn{padding:9px 18px;border:1px solid #d9dae2;border-radius:8px;font-size:14px;cursor:pointer;background:#fff}',
  '.forge-btn.primary{background:#2f6bff;border-color:#2f6bff;color:#fff;font-weight:600}',
  '.forge-btn.accent{background:#1f9d55;border-color:#1f9d55;color:#fff;font-weight:600}',
  '.forge-empty{color:#8b8b9a;font-size:13px;text-align:center;padding:18px 10px}',
  '.forge-fab{position:fixed;right:22px;bottom:22px;width:56px;height:56px;border-radius:50%;border:none;background:#2f6bff;color:#fff;font-size:22px;cursor:pointer;box-shadow:0 6px 18px rgba(47,107,255,.4);z-index:2000}',
].join('\n')

export async function apply(ctx: Context): Promise<void> {
  // 注入 CSS
  try {
    const style = document.createElement('style')
    style.textContent = CSS
    document.head.appendChild(style)
  } catch { /* no-op */ }

  const remote = ctx.get('remote') as unknown as { $mount(c: unknown): Promise<unknown> }
  await remote.$mount(ForgeRemoteContribution)
  // 必须用点分键取命名空间：cordis 的 traceable 代理对“未声明注入的嵌套属性”会拦截
  // （报 cannot get property "remote.forge" without inject）。
  // (ctx.get('remote')).forge 就是这种嵌套属性访问 —— 服务已注册也会被门禁拦下；
  // 而 ctx.get('remote.forge') 直接读服务注册表，服务存在即放行。
  const forgeRpc = ctx.get('remote.forge') as unknown as ForgeRpc

  const slots = ctx.get('slots') as unknown as {
    inject(name: string, fn: () => unknown): unknown
    register(spec: unknown, render: (props: unknown) => React.ReactElement): unknown
  }

  function fabView(): React.ReactElement {
    const [open, setOpen] = React.useState(false)
    const [entries, setEntries] = React.useState<ForgeEntry[]>([])
    const [quizView, setQuizView] = React.useState<{ sessionId: string } | null>(null)
    const [reportView, setReportView] = React.useState<{ sessionId: string; title: string } | null>(null)
    const refresh = () => { forgeRpc.list().then((d) => setEntries((d && d.entries) || [])).catch(() => {}) }
    React.useEffect(() => { refresh(); const iv = window.setInterval(refresh, 3000); return () => window.clearInterval(iv) }, [])

    const panel = open
      ? h('div', { className: 'forge-panel' },
          h('div', { className: 'forge-panel-head' },
            h('span', null, '⚡ InterviewForge 速练'),
            h('button', { className: 'forge-btn', onClick: () => setOpen(false), style: { padding: '2px 8px' } }, '收起')),
          h('div', { className: 'forge-list' },
            entries.length === 0
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

    return h('div', null,
      h('button', { className: 'forge-fab', onClick: () => setOpen((o) => !o), title: 'InterviewForge 速练' }, '⚡'),
      panel,
      quizView ? h(QuizRunner, { rpc: forgeRpc, sessionId: quizView.sessionId, onClose: () => { setQuizView(null); refresh() } }) : null,
      reportView ? h(ReportView, { rpc: forgeRpc, sessionId: reportView.sessionId, title: reportView.title, onClose: () => { setReportView(null); refresh() } }) : null)
  }

  function QuizRunner(props: { rpc: ForgeRpc; sessionId: string; onClose: () => void }): React.ReactElement {
    const [quiz, setQuiz] = React.useState<{ meta: { title: string }; questions: Q[] } | null>(null)
    const [view, setView] = React.useState<{ status: string; currentIndex: number; answers: Record<string, unknown>; elapsedGlobal: number; elapsedQuestion: number } | null>(null)
    const [selected, setSelected] = React.useState('')
    const [note, setNote] = React.useState('')
    const qid = quiz ? quiz.questions[view?.currentIndex || 0]?.id : ''
    React.useEffect(() => {
      props.rpc.applySeed({ sessionId: props.sessionId }).catch(() => {})
      props.rpc.load({ sessionId: props.sessionId }).then((d) => { if (d && d.quiz) setQuiz(d.quiz) }).catch(() => {})
      const poll = () => { props.rpc.snapshot({ sessionId: props.sessionId }).then((d) => { if (d) setView(d) }).catch(() => {}) }
      poll()
      const iv = window.setInterval(poll, 1000)
      return () => window.clearInterval(iv)
    }, [props.sessionId])

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
    const submit = () => {
      if (!canSubmit) return
      props.rpc.answer({ sessionId: props.sessionId, questionId: q.id, selected: isChoice ? selected : null, note: note || null }).then(() => {
        if (isLast) props.rpc.finish({ sessionId: props.sessionId }).then(() => { pollNow() }).catch(() => {})
        else props.rpc.nav({ sessionId: props.sessionId, index: view.currentIndex + 1 }).then(pollNow).catch(() => {})
      }).catch(() => {})
    }
    const pollNow = () => { props.rpc.snapshot({ sessionId: props.sessionId }).then((d) => { if (d) setView(d) }).catch(() => {}) }
    return h('div', { className: 'forge-modal' },
      h('div', { className: 'forge-card' },
        h('div', { className: 'forge-card-head' },
          h('span', null, '⚡ ' + quiz.meta.title + ' · 第 ' + (view.currentIndex + 1) + '/' + quiz.questions.length + ' 题'),
          h('button', { className: 'forge-btn', onClick: () => { props.rpc.pause({ sessionId: props.sessionId }).catch(() => {}); props.onClose() } }, '收起')),
        h('div', { className: 'forge-body' },
          h('div', { className: 'forge-q' },
            h('span', { className: 'forge-type ' + (isChoice ? 'forge-t-choice' : 'forge-t-open') }, isChoice ? '选择题' : '开放题'),
            h('div', { className: 'forge-stem' }, q.stem),
            isChoice && q.options
              ? h('div', null, q.options.map((o) =>
                  h('div', { key: o.key, className: 'forge-opt' + (selected === o.key ? ' sel' : ''), onClick: () => setSelected(o.key) },
                    h('span', { className: 'k' }, o.key), h('span', null, o.text))))
              : null,
            h('textarea', { className: 'forge-txt', value: note, placeholder: isChoice ? '写出你选择这个答案的理由…' : '请详细作答…', onChange: (e: { target: { value: string } }) => setNote(e.target.value) }),
            h('div', { className: 'forge-actions' },
              view.currentIndex > 0 ? h('button', { className: 'forge-btn', onClick: () => props.rpc.nav({ sessionId: props.sessionId, index: view.currentIndex - 1 }).then(pollNow).catch(() => {}) }, '← 上一题') : null,
              h('button', { className: 'forge-btn accent', disabled: !canSubmit, onClick: submit }, isLast ? '完成练习' : '提交并下一题'))))))
  }

  function ReportView(props: { rpc: ForgeRpc; sessionId: string; title: string; onClose: () => void }): React.ReactElement {
    const [html, setHtml] = React.useState<string | null>(null)
    React.useEffect(() => { props.rpc.report({ sessionId: props.sessionId }).then((d) => setHtml((d && d.reportHtml) || null)).catch(() => setHtml(null)) }, [props.sessionId])
    return h('div', { className: 'forge-modal' },
      h('div', { className: 'forge-card' },
        h('div', { className: 'forge-card-head' }, h('span', null, '📊 反馈报告 · ' + props.title), h('button', { className: 'forge-btn', onClick: props.onClose }, '✕ 关闭')),
        html
          ? h('iframe', { style: { flex: 1, border: 'none', width: '100%', height: '100%' }, srcDoc: html, sandbox: 'allow-scripts' })
          : h('div', { className: 'forge-empty' }, '报告尚未生成或读取失败')))
  }

  slots.inject('shell.overlay', () =>
    slots.register({ name: 'shell.overlay', id: 'forge-overlay', order: 65 }, () => h(fabView, null)))
}
