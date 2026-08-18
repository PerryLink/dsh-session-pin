// Verify the built artifacts after `pnpm run build`: syntax-check the host and
// client bundles, import the ESM host face under plain Node, and assert the
// client bundle's ModuleLoader handshake. Guards against TypeScript-only
// syntax leaking into shipped output and against a missing bundle patch.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

const required = ['lib/index.js', 'lib/client.js', 'cordis.patch.yml']
for (const rel of required) {
  if (!existsSync(path.join(root, rel))) throw new Error(`missing artifact: ${rel}`)
}

// 1. Syntax-check every JS bundle (plain Node parse; no execution).
for (const rel of ['lib/index.js', 'lib/client.js']) {
  execFileSync(process.execPath, ['--check', path.join(root, rel)], { stdio: 'inherit' })
}

// 2. The ESM host face must import under plain Node (no tsx, no checkout paths).
const index = await import(pathToFileURL(path.join(root, 'lib/index.js')).href)
if (typeof index.apply !== 'function' || index.name !== 'session-pin') {
  throw new Error('lib/index.js exports an unexpected plugin face')
}

// 3. The client bundle must carry the ModuleLoader handshake with the exact id.
const client = readFileSync(path.join(root, 'lib/client.js'), 'utf8')
if (!client.includes('window.__ModuleLoader__.load({')) {
  throw new Error('lib/client.js is missing the ModuleLoader handshake')
}
if (!/id:\s*"dsh-session-pin"/.test(client)) {
  throw new Error('lib/client.js stamps the wrong bundle id')
}

console.log('artifacts OK: syntax + ESM import + client bundle handshake')
