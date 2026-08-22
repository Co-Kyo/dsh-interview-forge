import { z } from 'zod'

// dsh-interview-forge#forge 命名空间的 typert remote contribution
// 供 client ctx.remote.forge.* 可用（在 apply 中 $mount）
export const ForgeRemoteContribution = {
  package: 'dsh-interview-forge',
  descriptors: [
    {
      id: 'dsh-interview-forge#forge/list',
      service: 'forge',
      namespace: 'forge',
      method: 'list',
      invocation: { kind: 'direct' },
      parameters: [],
      result: {
        mode: 'strict',
        typeSymbol: 'dsh-interview-forge#forge/list:result',
        schema: z.object({
          entries: z.array(z.object({
            sessionId: z.string(),
            dshSessionId: z.string().nullable().optional(),
            title: z.string(),
            totalQuestions: z.number(),
            status: z.string(),
            createdAt: z.number().nullable().optional(),
            archiveDir: z.string().nullable().optional(),
          })),
        }),
      },
    },
    {
      id: 'dsh-interview-forge#forge/history',
      service: 'forge',
      namespace: 'forge',
      method: 'history',
      invocation: { kind: 'direct' },
      parameters: [],
      result: {
        mode: 'strict',
        typeSymbol: 'dsh-interview-forge#forge/history:result',
        schema: z.object({
          days: z.array(z.object({
            year: z.number(),
            month: z.number(),
            day: z.number(),
            entries: z.array(z.object({
              sessionId: z.string(),
              title: z.string(),
              totalQuestions: z.number(),
              status: z.string(),
              correctCount: z.number().nullable().optional(),
              accuracy: z.number().nullable().optional(),
              durationMs: z.number().nullable().optional(),
            })),
          })),
        }),
      },
    },
    {
      id: 'dsh-interview-forge#forge/snapshot',
      service: 'forge',
      namespace: 'forge',
      method: 'snapshot',
      invocation: { kind: 'direct' },
      parameters: [{
        name: 'args',
        wire: 'args',
        source: 'json',
        codec: {
          mode: 'strict',
          typeSymbol: 'dsh-interview-forge#forge/snapshot:args',
          schema: z.object({ sessionId: z.string() }),
        },
      }],
      result: {
        mode: 'strict',
        typeSymbol: 'dsh-interview-forge#forge/snapshot:result',
        schema: z.object({
          sessionId: z.string(),
          status: z.string(),
          currentIndex: z.number(),
          answers: z.record(z.string(), z.unknown()),
          elapsedGlobal: z.number(),
          elapsedQuestion: z.number(),
        }).nullable(),
      },
    },
    {
      id: 'dsh-interview-forge#forge/answer',
      service: 'forge',
      namespace: 'forge',
      method: 'answer',
      invocation: { kind: 'direct' },
      parameters: [{
        name: 'args',
        wire: 'args',
        source: 'json',
        codec: {
          mode: 'strict',
          typeSymbol: 'dsh-interview-forge#forge/answer:args',
          schema: z.object({
            sessionId: z.string(),
            questionId: z.string(),
            selected: z.string().nullish(),
            note: z.string().nullish(),
          }),
        },
      }],
      result: {
        mode: 'strict',
        typeSymbol: 'dsh-interview-forge#forge/answer:result',
        schema: z.object({ ok: z.boolean() }),
      },
    },
    {
      id: 'dsh-interview-forge#forge/finish',
      service: 'forge',
      namespace: 'forge',
      method: 'finish',
      invocation: { kind: 'direct' },
      parameters: [{
        name: 'args',
        wire: 'args',
        source: 'json',
        codec: {
          mode: 'strict',
          typeSymbol: 'dsh-interview-forge#forge/finish:args',
          schema: z.object({ sessionId: z.string(), dshSessionId: z.string().nullish() }),
        },
      }],
      result: {
        mode: 'strict',
        typeSymbol: 'dsh-interview-forge#forge/finish:result',
        schema: z.object({ ok: z.boolean() }),
      },
    },
    {
      id: 'dsh-interview-forge#forge/load',
      service: 'forge',
      namespace: 'forge',
      method: 'load',
      invocation: { kind: 'direct' },
      parameters: [{
        name: 'args',
        wire: 'args',
        source: 'json',
        codec: {
          mode: 'strict',
          typeSymbol: 'dsh-interview-forge#forge/load:args',
          schema: z.object({ sessionId: z.string().nullish() }),
        },
      }],
      result: {
        mode: 'strict',
        typeSymbol: 'dsh-interview-forge#forge/load:result',
        schema: z.object({
          sessionId: z.string(),
          quiz: z.object({ meta: z.record(z.string(), z.unknown()), questions: z.array(z.record(z.string(), z.unknown())) }),
          meta: z.record(z.string(), z.unknown()),
          status: z.string(),
          startedAt: z.number(),
          progress: z.object({ currentIndex: z.number(), answers: z.record(z.string(), z.unknown()) }),
        }).nullable(),
      },
    },
    {
      id: 'dsh-interview-forge#forge/applySeed',
      service: 'forge',
      namespace: 'forge',
      method: 'applySeed',
      invocation: { kind: 'direct' },
      parameters: [{
        name: 'args',
        wire: 'args',
        source: 'json',
        codec: {
          mode: 'strict',
          typeSymbol: 'dsh-interview-forge#forge/applySeed:args',
          schema: z.object({ sessionId: z.string() }),
        },
      }],
      result: {
        mode: 'strict',
        typeSymbol: 'dsh-interview-forge#forge/applySeed:result',
        schema: z.object({ ok: z.boolean(), seeded: z.number().optional(), reason: z.string().optional() }),
      },
    },
    {
      id: 'dsh-interview-forge#forge/nav',
      service: 'forge',
      namespace: 'forge',
      method: 'nav',
      invocation: { kind: 'direct' },
      parameters: [{
        name: 'args',
        wire: 'args',
        source: 'json',
        codec: {
          mode: 'strict',
          typeSymbol: 'dsh-interview-forge#forge/nav:args',
          schema: z.object({ sessionId: z.string(), index: z.number() }),
        },
      }],
      result: {
        mode: 'strict',
        typeSymbol: 'dsh-interview-forge#forge/nav:result',
        schema: z.object({ ok: z.boolean() }),
      },
    },
    {
      id: 'dsh-interview-forge#forge/pause',
      service: 'forge',
      namespace: 'forge',
      method: 'pause',
      invocation: { kind: 'direct' },
      parameters: [{
        name: 'args',
        wire: 'args',
        source: 'json',
        codec: {
          mode: 'strict',
          typeSymbol: 'dsh-interview-forge#forge/pause:args',
          schema: z.object({ sessionId: z.string() }),
        },
      }],
      result: {
        mode: 'strict',
        typeSymbol: 'dsh-interview-forge#forge/pause:result',
        schema: z.object({ ok: z.boolean() }),
      },
    },
    {
      id: 'dsh-interview-forge#forge/resume',
      service: 'forge',
      namespace: 'forge',
      method: 'resume',
      invocation: { kind: 'direct' },
      parameters: [{
        name: 'args',
        wire: 'args',
        source: 'json',
        codec: {
          mode: 'strict',
          typeSymbol: 'dsh-interview-forge#forge/resume:args',
          schema: z.object({ sessionId: z.string() }),
        },
      }],
      result: {
        mode: 'strict',
        typeSymbol: 'dsh-interview-forge#forge/resume:result',
        schema: z.object({ ok: z.boolean() }),
      },
    },
    {
      id: 'dsh-interview-forge#forge/report',
      service: 'forge',
      namespace: 'forge',
      method: 'report',
      invocation: { kind: 'direct' },
      parameters: [{
        name: 'args',
        wire: 'args',
        source: 'json',
        codec: {
          mode: 'strict',
          typeSymbol: 'dsh-interview-forge#forge/report:args',
          schema: z.object({ sessionId: z.string() }),
        },
      }],
      result: {
        mode: 'strict',
        typeSymbol: 'dsh-interview-forge#forge/report:result',
        schema: z.object({ reportHtml: z.string().nullable() }),
      },
    },
  ],
} as const
