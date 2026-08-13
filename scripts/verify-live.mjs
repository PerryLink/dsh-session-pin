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
  // Wait for the sidebar session rows (the app restores the last session).
  const row = page.locator('[role="treeitem"][aria-selected]').first()
  await row.waitFor({ state: 'visible', timeout: 120000 })
  log('step ui: session row visible')

  // Send a benign first message so the row is non-blank (title appears even
  // if no model reply lands); reuse the current blank row when present.
  const blankRow = page.locator('[role="treeitem"][aria-selected]').filter({ hasText: 'New Session' }).first()
  const hasBlank = (await blankRow.count()) > 0
  if (hasBlank) {
    const composer = page.locator('[data-input-scroll] textarea, [data-input-scroll] [contenteditable="true"]').first()
    await composer.waitFor({ state: 'visible', timeout: 30000 })
    await composer.click()
    await page.keyboard.type('Pin badge demo: reply with the single word ok')
    await page.keyboard.press('Enter')
    // The row turns non-blank once the user message lands (title = fallback
    // truncation, model reply not required for the badge to apply).
    const titled = page.locator('[role="treeitem"][aria-selected]').filter({ hasNotText: 'New Session' }).first()
    await titled.waitFor({ state: 'visible', timeout: 30000 })
    log('step ui: demo session titled')
  } else {
    log('step ui: reuse existing titled session (no composer round)')
  }

  const target = page.locator('[role="treeitem"][aria-selected]').filter({ hasNotText: 'New Session' }).first()
  const title = (await target.textContent()) ?? 'session'
  log(`step ui: target row "${title.trim().slice(0, 40)}"`)

  // Gray pin on hover.
  await target.hover()
  const badge = target.locator(BADGE)
  await badge.waitFor({ state: 'visible', timeout: 15000 })
  log('step ui: gray pin badge appears on hover')
  await target.screenshot({ path: join(OUT_DIR, 'demo-hover.png') })

  // Pin it: amber + first row of its group.
  await badge.click()
  await page.waitForFunction((cls) => {
    const row = document.querySelector('[role="treeitem"][aria-selected]')
    const pin = row?.querySelector(`button.${cls}`)
    return pin !== null && pin.classList.contains('__dsh-session-pin-pinned__')
  }, BADGE.replace('button.', ''), { timeout: 15000 })
  log('step ui: badge turned amber (pinned)')
  await target.screenshot({ path: join(OUT_DIR, 'demo-pinned.png') })

  // Persistence: reload, no hover, badge must still be amber.
  await page.reload({ waitUntil: 'domcontentloaded' })
  const persisted = page.locator('[role="treeitem"][aria-selected]').filter({ hasNotText: 'New Session' }).first()
  await persisted.waitFor({ state: 'visible', timeout: 60000 })
  await persisted.locator(BADGE).waitFor({ state: 'visible', timeout: 15000 })
  const pinnedClass = await persisted.locator(BADGE).getAttribute('class') ?? ''
  if (!pinnedClass.includes('__dsh-session-pin-pinned__')) {
    fail('pin did not survive reload')
  } else {
    log('step persistence: pin survived reload (host settings)')
  }
} catch (error) {
  fail(`browser step failed: ${String(error)}`)
} finally {
  await browser.close()
}

writeFileSync(join(OUT_DIR, 'results.json'), JSON.stringify(results, null, 2))
console.log(`verify-live done, ok=${results.ok}`)
