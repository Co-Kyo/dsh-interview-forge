import { z } from 'zod'

// interview-forge-plugin#forge 命名空间的 typert remote contribution
// 供 client ctx.remote.forge.* 可用（在 apply 中 $mount）
export const ForgeRemoteContribution = {
  package: 'interview-forge-plugin',
  descriptors: [
    {
      id: 'interview-forge-plugin#forge/list',
      service: 'forge',
      namespace: 'forge',
      method: 'list',
      invocation: { kind: 'direct' },
      parameters: [],
      result: {
        mode: 'strict',
        typeSymbol: 'interview-forge-plugin#forge/list:result',
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
      id: 'interview-forge-plugin#forge/snapshot',
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
          typeSymbol: 'interview-forge-plugin#forge/snapshot:args',
          schema: z.object({ sessionId: z.string() }),
        },
      }],
      result: {
        mode: 'strict',
        typeSymbol: 'interview-forge-plugin#forge/snapshot:result',
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
      id: 'interview-forge-plugin#forge/answer',
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
          typeSymbol: 'interview-forge-plugin#forge/answer:args',
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
        typeSymbol: 'interview-forge-plugin#forge/answer:result',
        schema: z.object({ ok: z.boolean() }),
      },
    },
    {
      id: 'interview-forge-plugin#forge/finish',
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
          typeSymbol: 'interview-forge-plugin#forge/finish:args',
          schema: z.object({ sessionId: z.string(), dshSessionId: z.string().nullish() }),
        },
      }],
      result: {
        mode: 'strict',
        typeSymbol: 'interview-forge-plugin#forge/finish:result',
        schema: z.object({ ok: z.boolean() }),
      },
    },
    {
      id: 'interview-forge-plugin#forge/load',
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
          typeSymbol: 'interview-forge-plugin#forge/load:args',
          schema: z.object({ sessionId: z.string().nullish() }),
        },
      }],
      result: {
        mode: 'strict',
        typeSymbol: 'interview-forge-plugin#forge/load:result',
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
      id: 'interview-forge-plugin#forge/applySeed',
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
          typeSymbol: 'interview-forge-plugin#forge/applySeed:args',
          schema: z.object({ sessionId: z.string() }),
        },
      }],
      result: {
        mode: 'strict',
        typeSymbol: 'interview-forge-plugin#forge/applySeed:result',
        schema: z.object({ ok: z.boolean(), seeded: z.number().optional(), reason: z.string().optional() }),
      },
    },
    {
      id: 'interview-forge-plugin#forge/nav',
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
          typeSymbol: 'interview-forge-plugin#forge/nav:args',
          schema: z.object({ sessionId: z.string(), index: z.number() }),
        },
      }],
      result: {
        mode: 'strict',
        typeSymbol: 'interview-forge-plugin#forge/nav:result',
        schema: z.object({ ok: z.boolean() }),
      },
    },
    {
      id: 'interview-forge-plugin#forge/pause',
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
          typeSymbol: 'interview-forge-plugin#forge/pause:args',
          schema: z.object({ sessionId: z.string() }),
        },
      }],
      result: {
        mode: 'strict',
        typeSymbol: 'interview-forge-plugin#forge/pause:result',
        schema: z.object({ ok: z.boolean() }),
      },
    },
    {
      id: 'interview-forge-plugin#forge/resume',
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
          typeSymbol: 'interview-forge-plugin#forge/resume:args',
          schema: z.object({ sessionId: z.string() }),
        },
      }],
      result: {
        mode: 'strict',
        typeSymbol: 'interview-forge-plugin#forge/resume:result',
        schema: z.object({ ok: z.boolean() }),
      },
    },
    {
      id: 'interview-forge-plugin#forge/report',
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
          typeSymbol: 'interview-forge-plugin#forge/report:args',
          schema: z.object({ sessionId: z.string() }),
        },
      }],
      result: {
        mode: 'strict',
        typeSymbol: 'interview-forge-plugin#forge/report:result',
        schema: z.object({ reportHtml: z.string().nullable() }),
      },
    },
  ],
} as const
