// InterviewForge 速练 — client 半边完整版：$mount remote.forge + shell.overlay 浮层
import * as React from 'react'
import type { Context } from '@deepseek-ai/cordis'
import { ForgeRemoteContribution } from './forge-remote'

export const inject = ['slots', 'remote']
// 注意：不要在这里声明 'remote.forge'。remote.<namespace> 是由本插件的
// $mount(ForgeRemoteContribution) 安装到 client remote 服务上的（见下方 apply），
// 而 cordis 注入解析发生在 apply 之前 —— 声明它就是自等死锁：
// 永远等不到 → 入口 pending → web boot 报 “waiting for service: remote.forge”。
// 正确做法：只注入 remote，在 apply 里先 await $mount，再从 ctx.get('remote.forge') 取用。

interface ForgeEntry {
  sessionId: string
  title: string
  totalQuestions: number
  status: string
}

function h(type: unknown, props: unknown | null, ...children: React.ReactNode[]): React.ReactElement {
  return React.createElement(type as never, props as never, ...children)
}

export async function apply(ctx: Context): Promise<void> {
  const remote = ctx.get('remote') as unknown as {
    $mount(c: unknown): Promise<unknown>
    forge: {
      list(): Promise<{ entries: ForgeEntry[] }>
      snapshot(args: { sessionId: string }): Promise<unknown>
      answer(args: { sessionId: string; questionId: string; selected?: string | null; note?: string | null }): Promise<{ ok: boolean }>
      finish(args: { sessionId: string }): Promise<{ ok: boolean }>
    }
  }
  const slots = ctx.get('slots') as unknown as {
    inject(name: string, fn: () => unknown): unknown
    register(spec: unknown, render: (props: unknown) => React.ReactElement): unknown
  }

  try { await remote.$mount(ForgeRemoteContribution) } catch (e) { console.log('[forge] mount failed', e) }
  // $mount 之后 remote.forge 才可用；显式取一次，避免依赖动态属性反射时序。
  const forgeRemote = ctx.get('remote.forge') as unknown as {
    list(): Promise<{ entries: ForgeEntry[] }>
    snapshot(args: { sessionId: string }): Promise<unknown>
    answer(args: { sessionId: string; questionId: string; selected?: string | null; note?: string | null }): Promise<{ ok: boolean }>
    finish(args: { sessionId: string }): Promise<{ ok: boolean }>
  }

  function row(e: ForgeEntry): React.ReactElement {
    return h('li', { key: e.sessionId, style: { padding: '7px 0', borderBottom: '1px solid #eee' } },
      h('div', { style: { fontWeight: 600 } }, e.title),
      h('div', { style: { color: '#8b8b9a', fontSize: 12 } }, e.sessionId + ' · ' + String(e.totalQuestions) + ' 题'))
  }

  function Fab(): React.ReactElement {
    const [open, setOpen] = React.useState(false)
    const [entries, setEntries] = React.useState<ForgeEntry[]>([])
    React.useEffect(() => {
      if (!forgeRemote) return
      forgeRemote.list().then((d) => { try { setEntries((d && d.entries) || []) } catch (e) { console.log('[forge] list err', e) } }).catch((e) => console.log('[forge] list fail', e))
    }, [])
    const panel = open
      ? h('div', { style: { position: 'absolute', right: 0, bottom: 66, width: 300, background: '#fff', border: '1px solid #d9dae2', borderRadius: 12, padding: 12, boxShadow: '0 8px 24px rgba(0,0,0,.18)' } },
          h('div', { style: { fontWeight: 700, marginBottom: 8 } }, '⚡ InterviewForge 速练'),
          entries.length === 0
            ? h('div', { style: { color: '#8b8b9a' } }, '暂无进行中的练习')
            : h('ul', { style: { listStyle: 'none', margin: 0, padding: 0 } }, entries.filter((e) => e.status === 'answering').map(row)))
      : null
    return h('div', { style: { position: 'fixed', right: 22, bottom: 22, zIndex: 2000 } },
      h('button', {
        onClick: () => setOpen((o) => !o),
        style: { width: 56, height: 56, borderRadius: '50%', border: 'none', background: '#2f6bff', color: '#fff', fontSize: 22, cursor: 'pointer', boxShadow: '0 6px 18px rgba(47,107,255,.4)' },
      }, '⚡'),
      panel)
  }

  slots.inject('shell.overlay', () =>
    slots.register({ name: 'shell.overlay', id: 'forge-overlay', order: 65 }, () => h(Fab, null)))
}
