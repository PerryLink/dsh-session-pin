// SPDX-License-Identifier: Apache-2.0
/**
 * Build both plugin halves.
 * - Host half (`lib/index.js`): ESM for the harness process; the shared
 *   framework libraries stay external (the harness's own node_modules answer
 *   them at load time).
 * - Client half (`lib/client.js`): CJS wrapped in the web boot factory
 *   (`window.__ModuleLoader__.load({ id, factory })`), the format the
 *   client-module system materializes at `/plugins/<id>/client.js`.
 *   Type-only `@deepseek-ai/*` imports are erased by esbuild; a value import
 *   would inline a duplicate runtime instance, so the purity check fails the
 *   build when the bundle still mentions `@deepseek-ai/`.
 */
import { build } from 'esbuild'
import { mkdirSync, readFileSync } from 'node:fs'

const ID = '@dsh-external/dsh-session-pin'
const HOST_EXTERNALS = ['@deepseek-ai/schemastery', '@deepseek-ai/dsh-settings']

mkdirSync('lib', { recursive: true })

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'es2024',
  outfile: 'lib/index.js',
  sourcemap: true,
  external: HOST_EXTERNALS,
})

await build({
  entryPoints: ['src/client.ts'],
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  outfile: 'lib/client.js',
  sourcemap: true,
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
  },
  banner: {
    js: `window.__ModuleLoader__.load({ id: ${JSON.stringify(ID)}, factory: (require) => {\nvar module = { exports: {} }; var exports = module.exports;`,
  },
  footer: {
    js: 'return module.exports; } });',
  },
})

const clientBundle = readFileSync('lib/client.js', 'utf8')
if (clientBundle.includes('@deepseek-ai/')) {
  throw new Error(
    'client bundle purity: @deepseek-ai value imports must not reach the client bundle '
    + '(use type-only imports; cross-plugin collaboration goes through cordis services)',
  )
}

console.log('built lib/index.js and lib/client.js')
