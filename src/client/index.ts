// InterviewForge 速练 — client 半边（浏览器浮层）
// 参照官方 packages/client/ui-goal/src/client/index.ts。
// 注入 slots + remote；ctx.slots.inject('shell.overlay') 挂载 ⚡ 速练浮层，
// 数据跨端走 ctx.remote.forge.*。
import * as React from 'react'
import type { Context } from '@deepseek-ai/cordis'

export const inject = ['slots', 'remote']

interface ForgeEntry {
  sessionId: string
  title: string
  totalQuestions: number
  status: string
}

function h(type: unknown, props: unknown | null, ...children: React.ReactNode[]): React.ReactElement {
  return React.createElement(type as never, props as never, ...children)
}

export function apply(ctx: Context): void {
  const remote = ctx.get('remote') as unknown as {
    forge: {
      list(): Promise<{ entries: ForgeEntry[] }>
      snapshot(args: { sessionId: string }): Promise<unknown>
      report(args: { sessionId: string }): Promise<{ reportHtml: string | null }>
    }
  }
  const slots = ctx.get('slots') as unknown as {
    inject(name: string, fn: () => unknown): unknown
    register(spec: unknown, render: (props: unknown) => React.ReactElement): unknown
  }

  function entryRow(e: ForgeEntry): React.ReactElement {
    return h('li', { key: e.sessionId, style: { padding: '6px 0', borderBottom: '1px solid #eee' } },
      h('span', null, e.title),
      h('span', { style: { float: 'right', color: '#2f6bff' } }, String(e.totalQuestions) + ' 题'))
  }

  function ForgeFab(): React.ReactElement {
    const [entries, setEntries] = React.useState<ForgeEntry[]>([])
    const [open, setOpen] = React.useState(false)
    React.useEffect(() => {
      remote.forge.list().then((d) => setEntries(d.entries || [])).catch(() => {})
    }, [])
    const body = open
      ? h('div', { style: { position: 'absolute', right: 0, bottom: 66, width: 280, background: '#fff', border: '1px solid #d9dae2', borderRadius: 10, padding: 10, boxShadow: '0 6px 20px rgba(0,0,0,.15)' } },
          h('div', { style: { fontWeight: 700, marginBottom: 8 } }, 'InterviewForge 速练'),
          entries.length === 0
            ? h('div', { style: { color: '#8b8b9a' } }, '暂无练习')
            : h('ul', { style: { listStyle: 'none', margin: 0, padding: 0 } },
                entries.filter((e) => e.status === 'answering').map(entryRow)))
      : null
    return h('div', { style: { position: 'fixed', right: 22, bottom: 22, zIndex: 1300 } },
      h('button', {
        onClick: () => setOpen((o) => !o),
        style: { width: 56, height: 56, borderRadius: '50%', border: 'none', background: '#2f6bff', color: '#fff', fontSize: 22, cursor: 'pointer' },
      }, '⚡'),
      body)
  }

  slots.inject('shell.overlay', () =>
    slots.register({ name: 'shell.overlay', id: 'forge-overlay', order: 60 }, () => h(ForgeFab, null)))
}
