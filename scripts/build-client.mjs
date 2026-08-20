// Build the InterviewForge browser client bundle in DSH's __ModuleLoader__ shape.
// 参照官方 tsdown.client.ts 的 clientBundle：产出
//   window.__ModuleLoader__.load({ id, factory: (require) => { ... } })
// externals 由浏览器 loader 的 module table 提供（react 等平台模块），不内联。
import { build } from 'esbuild'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8'))
const ID = pkg.name

await build({
  entryPoints: ['src/client/index.ts'],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2022',
  outfile: 'lib/client.js',
  external: ['react', 'react/jsx-runtime'],
  banner: {
    js: `window.__ModuleLoader__.load({\n  id: ${JSON.stringify(ID)},\n  factory: (require) => {`,
  },
  footer: {
    js: `\n  }\n});`,
  },
  logLevel: 'info',
})

console.log('✅ client bundle written to lib/client.js')
