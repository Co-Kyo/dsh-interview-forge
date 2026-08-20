// InterviewForge 速练 — client 半边（浏览器浮层，诊断精简版）
import * as React from 'react'
import type { Context } from '@deepseek-ai/cordis'

export const inject = ['slots']

function h(type: unknown, props: unknown | null, ...children: React.ReactNode[]): React.ReactElement {
  return React.createElement(type as never, props as never, ...children)
}

export function apply(ctx: Context): void {
  const slots = ctx.get('slots') as unknown as {
    inject(name: string, fn: () => unknown): unknown
    register(spec: unknown, render: (props: unknown) => React.ReactElement): unknown
  }

  function Fab(): React.ReactElement {
    return h(React.Fragment, null,
      h('div', {
        style: { position: 'fixed', right: 22, bottom: 22, zIndex: 2000, width: 56, height: 56, borderRadius: '50%', background: '#d93045', color: '#fff', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
      }, '⚡FORGE'))
  }

  slots.inject('shell.overlay', () =>
    slots.register({ name: 'shell.overlay', id: 'forge-overlay', order: 65 }, () => h(Fab, null)))
}
