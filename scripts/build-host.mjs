// Build the InterviewForge host cross-end gateway (src/host/forge-gateway.ts → lib/forge-gateway.js).
// 关键点：
//  - 必须保持 @deepseek-ai/dsh-typert-protocol 为裸 import（external 不内联）。
//    @Remote 装饰器把方法标记写进该模块实例的私有 WeakMap，
//    而 host api-gateway 的 SRC 回退由同一个实例读取（remoteMethods），
//    内联就会产生第二个实例 → marker 读取不到 → “no active Remote method exports this endpoint”。
//  - esbuild 对标准装饰器输出 context.addInitializer 语义（已验证），协议层可用。
//  - cordis 只作类型导入，编译后自然擦除（esbuild 自动处理）。
import { build } from 'esbuild'

const PROTOCOL = '@deepseek-ai/dsh-typert-protocol'

await build({
  entryPoints: ['src/host/forge-gateway.ts'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'es2022',
  outfile: 'lib/forge-gateway.js',
  external: [PROTOCOL],
  logLevel: 'info',
})

console.log('✅ host gateway written to lib/forge-gateway.js')
