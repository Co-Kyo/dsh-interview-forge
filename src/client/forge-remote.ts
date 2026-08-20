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
  ],
} as const
