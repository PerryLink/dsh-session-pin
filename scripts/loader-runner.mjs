// scripts/loader-runner.mjs — real Loader composition runner for
// dsh-session-pin (community five-layer model, layer 4). An independent
// process boots a real Context, mounts the vendored Loader with the Include
// builtin, mounts an in-memory settings provider (the plugin's only hard
// service), reads the given cordis.yml (the plugin row + config), and asserts
// the plugin's contribution through the authoritative settings registry. The
// resolved namespace value proves the Loader applied the config in the file.
//
// Usage: node scripts/loader-runner.mjs <cordis.yml>
// Exit 0 prints DSH_LOADER_RESULT <json>; any load or assertion failure exits
// non-zero with the reason on stderr (used by the invalid-config and
// default-export regression cases).

import { Context } from '@deepseek-ai/cordis'
import Include from '@deepseek-ai/cordis-plugin-include'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import { SettingsProvider } from '@deepseek-ai/dsh-settings'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

/** In-memory settings provider: the plugin registers the session-pin namespace on it. */
class InMemorySettings extends SettingsProvider {
  writable = true
  async load() { return {} }
  async persist() {}
}

const configArgument = process.argv[2]
if (configArgument === undefined) {
  console.error('usage: loader-runner.mjs <cordis.yml>')
  process.exit(2)
}

const configPath = resolve(configArgument)
const configRequire = createRequire(resolve(import.meta.dirname, '../package.json'))

const ctx = new Context()
try {
  ctx.baseUrl = `${pathToFileURL(dirname(configPath)).href}/`
  await ctx.plugin(Loader)
  ctx.loader.internal = /** @type {any} */ ({
    version: 'v2',
    async import(specifier) {
      if (specifier.startsWith('file:')) return import(specifier)
      if (specifier.startsWith('node:')) return import(specifier)
      const absolute = /^([a-zA-Z]:)?[\\/]/u.test(specifier)
      return import(pathToFileURL(absolute ? specifier : configRequire.resolve(specifier)).href)
    },
  })
  ctx.loader.builtins.include = Include
  await ctx.plugin(InMemorySettings)
  await ctx.loader.create({
    name: 'cordis:include',
    config: { path: pathToFileURL(configPath).href },
  })
  await ctx.loader.await()

  // Authoritative registry carries the plugin's contribution: the session-pin
  // settings namespace with the config-applied base layer.
  const resolved = ctx.settings.get(/** @type {import('@deepseek-ai/dsh-settings').SettingsNamespace} */ ('session-pin'))
  if (resolved === undefined || typeof resolved !== 'object' || resolved === null) {
    throw new Error('Loader composition: session-pin settings namespace is not registered')
  }

  const summary = {
    namespace: 'session-pin',
    maxPins: resolved.maxPins,
    reorderOnLoad: resolved.reorderOnLoad,
  }
  process.stdout.write(`DSH_LOADER_RESULT ${JSON.stringify(summary)}\n`)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
} finally {
  await ctx.fiber.dispose()
}
