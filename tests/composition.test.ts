// SPDX-License-Identifier: Apache-2.0
/**
 * Real Loader composition suite (community five-layer model, layer 4): an
 * independent process mounts the Loader over a cordis.yml with the plugin row,
 * proving the BUILT entry loads under plain Node (A1) and that inject + config
 * resolution work. On the `0.1.7` settings contract the entry id names the
 * settings form and the resolved Config is the live surface a client reads, so
 * the runner reports the entry id, the plugin's presentation claim, and the
 * Config reached through that claim. Also carries the negative regressions: an
 * invalid config must fail loud, and a default export must not silently mount
 * a schema-less stand-in that accepts one.
 *
 * @module dsh-session-pin/test/composition.test
 */

import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const runner = join(repositoryRoot, 'scripts', 'loader-runner.mjs')
const builtEntry = join(repositoryRoot, 'lib', 'index.js')
const builtUrl = pathToFileURL(builtEntry).href

/** Profile entry id the bundle patch mounts (`cordis.patch.yml`) and the browser half binds. */
const ENTRY_ID = 'session-pin'

/** One cordis.yml: just the plugin row with optional config. */
function configFor(pluginRow: string, configLines: string[] = []): string {
  return [
    `- id: ${ENTRY_ID}`,
    `  name: ${JSON.stringify(pluginRow)}`,
    ...(configLines.length > 0 ? ['  config:', ...configLines.map(line => `    ${line}`)] : []),
    '',
  ].join('\n')
}

function runRunner(configPath: string) {
  const result = spawnSync(process.execPath, [runner, configPath], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    env: { ...process.env },
    timeout: 120_000,
  })
  if (result.error !== undefined) throw result.error
  return { status: result.status, stdout: result.stdout, stderr: result.stderr }
}

const temporaryRoot = mkdtempSync(join(tmpdir(), 'dsh-session-pin-loader-'))

beforeAll(() => {
  const build = spawnSync('pnpm', ['run', 'build'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    env: { ...process.env },
    shell: process.platform === 'win32',
    timeout: 120_000,
  })
  if (build.status !== 0) {
    throw new Error(`build failed (${String(build.status)}):\n${build.stdout}\n${build.stderr}`)
  }
}, 120_000)

afterAll(() => {
  rmSync(temporaryRoot, { recursive: true, force: true })
})

describe('Loader composition', () => {
  it('mounts the built plugin, claims its settings form, and applies the configured maxPins live', () => {
    const configPath = join(temporaryRoot, 'valid.yml')
    writeFileSync(configPath, configFor(builtUrl, ['maxPins: 5']))
    const evidence = runRunner(configPath)
    expect(evidence.status, `stderr:\n${evidence.stderr}`).toBe(0)
    expect(evidence.stdout).toContain('DSH_LOADER_RESULT')
    const marker = evidence.stdout.match(/DSH_LOADER_RESULT (.+)$/mu)
    const summary = JSON.parse(marker![1]!)
    expect(summary.entryId).toBe(ENTRY_ID)
    expect(summary.configures).toBe(1)
    expect(summary.auto).toBe(true)
    expect(summary.live).toBe(true)
    expect(summary.maxPins).toBe(5)
  })

  it('fails loud through the Loader for an out-of-domain maxPins', () => {
    const configPath = join(temporaryRoot, 'invalid-config.yml')
    writeFileSync(configPath, configFor(builtUrl, ['maxPins: -1']))
    const evidence = runRunner(configPath)
    expect(evidence.status).not.toBe(0)
    expect(evidence.stderr).toMatch(/maxPins/u)
  })

  it('proves a default export would mount a schema-less stand-in that accepts the same bad config', () => {
    // A default export is the Loader's unwrap target (`exports.default ??
    // exports`), so the row would mount a bare `apply` with no name, no inject
    // and — decisively — no Config schema: the out-of-domain value above is
    // then accepted verbatim and no live reference ever reaches a client.
    const wrapper = join(temporaryRoot, 'default-export.mjs')
    writeFileSync(wrapper, [
      `export { name, inject, Config, apply } from ${JSON.stringify(builtUrl)}`,
      `export { apply as default } from ${JSON.stringify(builtUrl)}`,
      '',
    ].join('\n'))
    const configPath = join(temporaryRoot, 'invalid-default.yml')
    writeFileSync(configPath, configFor(pathToFileURL(wrapper).href, ['maxPins: -1']))
    const evidence = runRunner(configPath)
    expect(evidence.status, `stderr:\n${evidence.stderr}`).toBe(0)
    const marker = evidence.stdout.match(/DSH_LOADER_RESULT (.+)$/mu)
    const summary = JSON.parse(marker![1]!)
    expect(summary.live).toBe(false)
    expect(summary.maxPins).toBe(-1)
  })
})
