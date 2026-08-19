// InterviewForge 速练 — host 跨端服务（TypertRemoteService）
// 参照官方 packages/host/plugin-inventory/src/index.ts。
// 提供供 client 半边 ctx.remote.forge.* 调用的跨端方法。
import type { Context } from '@deepseek-ai/cordis'
import { TypertRemoteService, Remote } from '@deepseek-ai/dsh-typert-protocol'

export interface ForgeSnapshot {
  sessionId: string
  status: string
  currentIndex: number
  answers: Record<string, unknown>
  elapsedGlobal: number
  elapsedQuestion: number
}

/** Remote-only service exposing InterviewForge session state to the browser client. */
export class ForgeGateway extends TypertRemoteService {
  static inject = ['fs']

  private store: { sessions: Map<string, unknown> }

  constructor(ctx: Context) {
    super(ctx, 'forge')
    this.store = { sessions: new Map() }
  }

  @Remote('list')
  list(): { entries: unknown[] } {
    return { entries: [] }
  }

  @Remote('snapshot')
  snapshot(args: { sessionId: string }): ForgeSnapshot | null {
    return {
      sessionId: args.sessionId,
      status: 'answering',
      currentIndex: 0,
      answers: {},
      elapsedGlobal: 0,
      elapsedQuestion: 0,
    }
  }

  @Remote('report')
  report(args: { sessionId: string }): { reportHtml: string | null } {
    return { reportHtml: null }
  }

  @Remote('load')
  load(args: { sessionId: string }): unknown {
    return { sessionId: args.sessionId, quiz: null, status: 'answering' }
  }

  @Remote('applySeed')
  applySeed(args: { sessionId: string }): { ok: boolean; seeded?: number } {
    void args
    return { ok: true, seeded: 0 }
  }

  @Remote('answer')
  answer(args: { sessionId: string; questionId: string; selected?: string | null; note?: string | null }): { ok: boolean } {
    void args
    return { ok: true }
  }

  @Remote('nav')
  nav(args: { sessionId: string; index: number }): { ok: boolean } {
    void args
    return { ok: true }
  }

  @Remote('pause')
  pause(args: { sessionId: string }): { ok: boolean } {
    void args
    return { ok: true }
  }

  @Remote('resume')
  resume(args: { sessionId: string }): { ok: boolean } {
    void args
    return { ok: true }
  }

  @Remote('finish')
  finish(args: { sessionId: string }): { ok: boolean } {
    void args
    return { ok: true }
  }
}

export default ForgeGateway
