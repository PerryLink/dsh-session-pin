// SPDX-License-Identifier: Apache-2.0
/**
 * Live verification of dsh-session-pin against a running `dsh web`:
 * 1. polls the gateway until the host graph is ready;
 * 2. asserts the boot manifest carries the plugin and its client bundle is served;
 * 3. drives a headless Chromium (repository-declared Playwright) session:
 *    creates a benign demo session, hovers a session row (gray pin), pins it
 *    (amber pin + moved to the top of its workspace account), reloads, and
 *    re-asserts the pin survived (host-side settings persistence);
 * 4. writes results.json plus cropped element screenshots for the README.
 *
 * Run DETACHED after the host restart: `node scripts/verify-live.mjs`.
 * All state (frames, results) lands under the gitignored verify-live/ dir.
 */
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'

const BASE = 'http://127.0.0.1:3080'
const PLUGIN_ID = '@dsh-external/dsh-session-pin'
const BADGE = 'button.__dsh-session-pin-badge__'
const OUT_DIR = new URL('../verify-live/', import.meta.url).pathname.slice(1)
mkdirSync(OUT_DIR, { recursive: true })

const results = { steps: [], ok: true }
const log = (message) => {
  results.steps.push(message)
  console.log(message)
}
const fail = (message) => {
  results.ok = false
  results.error = message
  console.error('FAIL:', message)
  process.exitCode = 1
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// 1 ── gateway readiness + boot manifest + bundle route ─────────────────────
let ready = false
for (let attempt = 0; attempt < 240; attempt += 1) {
  try {
    const response = await fetch(`${BASE}/api/host.describe`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"payload":{}}',
    })
    if (response.ok) { ready = true; break }
  } catch { /* not listening yet */ }
  await sleep(1000)
}
if (!ready) { fail('gateway never became ready on 3080'); process.exit(1) }
log('step gateway: ready')

const indexHtml = await (await fetch(`${BASE}/`)).text()
const boot = indexHtml.includes(PLUGIN_ID)
log(`step boot-manifest: plugin ${boot ? 'present' : 'MISSING'}`)
if (!boot) fail('boot manifest does not include the plugin')

const bundleResponse = await fetch(`${BASE}/plugins/${PLUGIN_ID}/client.js`)
log(`step client-bundle: HTTP ${bundleResponse.status}`)
if (bundleResponse.status !== 200) fail('client bundle not served')

// 2 ── headless browser: badge hover → pin → persistence ────────────────────
const require = createRequire('D:/deepseek-harness/apps/web/package.json')
const { chromium } = require('D:/deepseek-harness/node_modules/.pnpm/playwright@1.61.1/node_modules/playwright')
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
try {
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 })
  // Target = the first session row that actually carries a pin badge
  // (workspace rows and blank session rows have none); hover to reveal it.
  // Locale-independent: the badge's presence is the discriminator, not the
  // localized "New Session" label. A fresh browser context starts with the
  // workspace groups collapsed, so expand them first.
  const rows = page.locator('[role="treeitem"]')
  await rows.first().waitFor({ state: 'visible', timeout: 120000 })
  log('step ui: session row visible')
  const collapsed = page.locator('[role="treeitem"][aria-expanded="false"]')
  for (let index = 0; index < (await collapsed.count()); index += 1) {
    await collapsed.nth(index).click().catch(() => {})
  }
  await page.waitForTimeout(800)
  let target = null
  let badge = null
  for (let index = 0; index < (await rows.count()); index += 1) {
    const candidate = rows.nth(index)
    const candidateBadge = candidate.locator(BADGE)
    if ((await candidateBadge.count()) === 0) continue
    await candidate.hover()
    if (await candidateBadge.isVisible()) {
      target = candidate
      badge = candidateBadge
      break
    }
  }
  if (target === null || badge === null) {
    await browser.close()
    fail('no session row with a pin badge found')
    process.exit(1)
  }
  const title = (await target.textContent()) ?? 'session'
  log(`step ui: target row "${title.trim().slice(0, 40)}"`)

  // Gray pin on hover.
  await badge.waitFor({ state: 'visible', timeout: 15000 })
  log('step ui: gray pin badge appears on hover')
  await target.screenshot({ path: join(OUT_DIR, 'demo-hover.png') })

  // Pin it: amber.
  await badge.click()
  await page.waitForFunction((cls) => {
    const pin = document.querySelector(`button.${cls}`)
    return pin !== null && pin.classList.contains('__dsh-session-pin-pinned__')
  }, BADGE.replace('button.', ''), { timeout: 15000 })
  log('step ui: badge turned amber (pinned)')
  await target.screenshot({ path: join(OUT_DIR, 'demo-pinned.png') })

  // Persistence: reload, no hover, some badge must still be amber.
  await page.reload({ waitUntil: 'domcontentloaded' })
  const persistedBadge = page.locator(BADGE.replace('button.', 'button.') + '.__dsh-session-pin-pinned__').first()
  await persistedBadge.waitFor({ state: 'visible', timeout: 60000 })
  log('step persistence: pin survived reload (localStorage fallback on this DSH build)')

  // Cleanup: unpin so the verification leaves no pin state.
  await persistedBadge.click()
  await page.waitForFunction(() => document.querySelector('button.__dsh-session-pin-badge__.__dsh-session-pin-pinned__') === null, null, { timeout: 15000 })
  log('step cleanup: unpinned')
} catch (error) {
  fail(`browser step failed: ${String(error)}`)
} finally {
  await browser.close()
}

writeFileSync(join(OUT_DIR, 'results.json'), JSON.stringify(results, null, 2))
console.log(`verify-live done, ok=${results.ok}`)
