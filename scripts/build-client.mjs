// Build the InterviewForge browser client bundle in DSH's __ModuleLoader__ shape.
// 参照官方 packages/client/tsdown.client.ts 的 clientConfig：产出
//   window.__ModuleLoader__.load({ id, factory: (require) => { ... return module.exports; } })
// 关键点：web 壳的 ClientModuleSystem.materialize 把 factory 的返回值当作模块导出，
// 而 loader 再把该导出视为插件对象（{ inject, apply }）。format 必须是 cjs +
// intro 提供 module/exports 垫片 + footer 显式 return module.exports，否则 factory
// 返回 undefined，loader 报 “invalid plugin … received undefined”。
// externals 由浏览器 loader 的 module table 提供（react 等平台模块），不内联。
import { build } from 'esbuild'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8'))
const ID = pkg.name

await build({
  entryPoints: ['src/client/index.ts'],
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  outfile: 'lib/client.js',
  external: ['react', 'react/jsx-runtime'],
  banner: {
    js: `window.__ModuleLoader__.load({\n  id: ${JSON.stringify(ID)},\n  factory: (require) => {\nvar module = { exports: {} }; var exports = module.exports;`,
  },
  footer: {
    js: `\nreturn module.exports; } });`,
  },
  logLevel: 'info',
})

console.log('✅ client bundle written to lib/client.js')
