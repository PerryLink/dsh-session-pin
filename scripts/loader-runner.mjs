// scripts/loader-runner.mjs — real Loader composition runner for
// dsh-session-pin (community five-layer model, layer 4). An independent
// process boots a real Context, mounts the vendored Loader with the Include
// builtin, mounts a minimal settings stand-in (the plugin's only injected
// service), reads the given cordis.yml (the plugin row + config), and asserts
// the plugin's contribution through the authoritative settings service.
//
// On the 0.1.7 contract a plugin's settings surface IS its own live Config:
// the row id names the form and the `.volatile()` Config fields are what a
// client reads and writes. So the evidence is (a) the row's entry id, (b) the
// single `settings.configure` claim and the fiber that made it, and (c) the
// resolved Config reached through that fiber — a LIVE reference when the row
// carried the real module, a raw value when it did not.
//
// Usage: node scripts/loader-runner.mjs <cordis.yml>
// Exit 0 prints DSH_LOADER_RESULT <json>; any load or assertion failure exits
// non-zero with the reason on stderr (used by the invalid-config and
// default-export regression cases).

import { Context } from '@deepseek-ai/cordis'
import Include from '@deepseek-ai/cordis-plugin-include'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

/** Presentation claims recorded from the plugin's `settings.configure` call. */
const claims = []

/** Minimal settings stand-in: enough of the seam the plugin actually calls. */
const settings = {
  configure(presentation, owner) {
    claims.push({ auto: presentation.auto, owner })
    return () => {}
  },
  async update() {},
}

const configArgument = process.argv[2]
if (configArgument === undefined) {
  console.error('usage: loader-runner.mjs <cordis.yml>')
  process.exit(2)
}

const configPath = resolve(configArgument)
const configRequire = createRequire(resolve(import.meta.dirname, '../package.json'))

/** Read a live Config field: a volatile reference answers `get()`, a raw value is itself. */
const value = (field) => (typeof field?.get === 'function' ? field.get() : field)

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
  await ctx.plugin({
    name: 'settings-provider',
    inject: [],
    apply: (providerCtx) => {
      providerCtx.provide('settings', settings)
    },
  })
  await ctx.loader.create({
    name: 'cordis:include',
    config: { path: pathToFileURL(configPath).href },
  })
  await ctx.loader.await()

  // Authoritative registry carries the plugin's contribution: one presentation
  // claim, the entry fiber that made it, and the live Config behind it.
  if (claims.length !== 1) {
    throw new Error(`Loader composition: expected exactly one settings.configure claim, got ${claims.length}`)
  }
  const claim = claims[0]
  const entries = [...ctx.loader.entries()]
  // Match by fiber uid: `ctx.fiber` and `Entry.fiber` are the same runtime
  // instance but not always the same proxy object.
  const entry = entries.find(candidate => candidate.fiber?.uid === claim.owner?.uid)
  if (entry === undefined) {
    const seen = entries.map(candidate => `${candidate.id}[uid=${candidate.fiber?.uid ?? 'none'}]`).join(', ')
    throw new Error(`Loader composition: the settings claim was not made by a mounted loader entry (claim uid=${claim.owner?.uid ?? 'none'}; entries: ${seen || 'none'})`)
  }
  const config = claim.owner.config
  if (config === undefined || typeof config !== 'object') {
    throw new Error('Loader composition: the mounted entry carried no resolved config')
  }

  const summary = {
    entryId: entry.options?.id ?? entry.id,
    configures: claims.length,
    auto: claim.auto,
    live: typeof config.maxPins?.get === 'function',
    maxPins: value(config.maxPins),
    reorderOnLoad: value(config.reorderOnLoad),
  }
  process.stdout.write(`DSH_LOADER_RESULT ${JSON.stringify(summary)}\n`)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
} finally {
  await ctx.fiber.dispose()
}
