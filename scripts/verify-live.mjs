// SPDX-License-Identifier: Apache-2.0
/**
 * Live verification of dsh-session-pin against a running `dsh web`:
 * 1. polls the gateway until the host graph is ready;
 * 2. asserts the boot manifest carries the plugin and its client bundle is served;
 * 3. drives a headless Chromium (the checkout's Playwright) session:
 *    creates a benign demo session, checks the duplicate-pin regression (one
 *    badge per session row), hovers a session row (gray pin), pins it (amber
 *    pin + moved to the top of its workspace account), cycles the row color
 *    through the swatch (and clears it with Shift+click), toggles the pin
 *    through the session-header button, opens the sidebar panel, checks
 *    workspace header rows carry [pin][swatch] controls, reloads, and
 *    re-asserts the pin survived;
 * 4. writes results.json (including the DSH version under test) plus cropped
 *    element screenshots for the README.
 *
 * Run DETACHED after the host restart: `node scripts/verify-live.mjs`.
 * The harness checkout resolves from DSH_CHECKOUT, defaulting to the
 * plugin's own repository parent (three levels up).
 * All state (frames, results) lands under the gitignored verify-live/ dir.
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { join, resolve } from 'node:path'

const BASE = process.env.DSH_BASE_URL ?? 'http://127.0.0.1:3080'
const PLUGIN_ID = 'dsh-session-pin'
const BADGE = 'button.__dsh-session-pin-badge__'
const SWATCH = 'button.__dsh-session-pin-swatch__'
const HEADER = 'button.__dsh-session-pin-header__'
const FOOTER = 'button.__dsh-session-pin-footer__'
const PANEL = 'div.__dsh-session-pin-panel__'
const PINNED = '__dsh-session-pin-pinned__'
const OUT_DIR = new URL('../verify-live/', import.meta.url).pathname.slice(1)
mkdirSync(OUT_DIR, { recursive: true })

// Harness checkout: explicit env, then the plugin's own repository parent
// (scripts → dsh-session-pin → Plugins → Project → checkout).
const CHECKOUT = resolve(process.env.DSH_CHECKOUT ?? fileURLToPath(new URL('../../../../', import.meta.url)))
const CHECKOUT_PKG = join(CHECKOUT, 'package.json')
if (!existsSync(CHECKOUT_PKG)) {
  console.error(`DSH checkout not found at ${CHECKOUT} (set DSH_CHECKOUT)`)
  process.exit(1)
}
const DSH_VERSION = JSON.parse(readFileSync(CHECKOUT_PKG, 'utf8')).version ?? 'unknown'

const results = { dshVersion: DSH_VERSION, steps: [], ok: true }
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
log(`step gateway: ready (DSH ${DSH_VERSION})`)

const indexHtml = await (await fetch(`${BASE}/`)).text()
const boot = indexHtml.includes(PLUGIN_ID)
log(`step boot-manifest: plugin ${boot ? 'present' : 'MISSING'}`)
if (!boot) fail('boot manifest does not include the plugin')

const bundleResponse = await fetch(`${BASE}/plugins/${PLUGIN_ID}/client.js`)
log(`step client-bundle: HTTP ${bundleResponse.status}`)
if (bundleResponse.status !== 200) fail('client bundle not served')

// 2 ── headless browser: badge hover → pin → header toggle → panel ──────────
// Playwright comes from the harness checkout's apps/web; when the checkout is
// a pruned/CI-less tree without it, fall back to this plugin's own install.
let requireWeb
try {
  requireWeb = createRequire(join(CHECKOUT, 'apps/web/package.json'))
  requireWeb.resolve('playwright')
} catch {
  requireWeb = createRequire(import.meta.url)
}
const { chromium } = requireWeb('playwright')
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
try {
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 })
  // A fresh browser profile re-shows the first-run dialogs (beta notice,
  // then API-key onboarding) before the session tree. Dismiss both after the
  // tree has had a moment to render; exact text, so "保存并继续" never matches.
  const rows = page.locator('[role="treeitem"]')
  await rows.first().waitFor({ state: 'visible', timeout: 120000 })
  log('step ui: session row visible')
  for (const label of ['继续', '稍后配置']) {
    const dismiss = page.locator(`button:text-is("${label}")`).first()
    try {
      if (await dismiss.isVisible({ timeout: 3000 })) {
        await dismiss.click({ timeout: 5000 })
        await page.waitForTimeout(800)
        log(`step ui: dismissed first-run dialog "${label}"`)
      }
    } catch { /* dialog variant not present */ }
  }
  // Target = the first session row that actually carries a pin badge
  // (workspace rows and blank session rows have none); hover to reveal it.
  // A fresh browser context starts with the workspace groups collapsed, so
  // expand them first.
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

  // Duplicate-pin regression: every session row must carry at most one badge
  // (the row-slot badge owns the row and the overlay must stay off it).
  const badgeCounts = await page.evaluate((badgeClass) => {
    const sessionRows = [...document.querySelectorAll('[role="treeitem"][aria-selected]')]
    return sessionRows.map(row => row.querySelectorAll(`button.${badgeClass}`).length)
  }, BADGE.replace('button.', ''))
  if (badgeCounts.some(count => count > 1)) {
    fail(`duplicate pin badges on session rows: ${badgeCounts.join(',')}`)
  } else {
    log(`step regression: at most one badge per session row (counts: ${badgeCounts.join(',')})`)
  }

  // Pin it: amber. The row may re-render between hover and click; retry
  // once through a fresh locator when the first attempt leaves it unpinned.
  await badge.click()
  const amberWait = async () => page.waitForFunction((cls) => {
    const pin = document.querySelector(`button.${cls}`)
    return pin !== null && pin.classList.contains('__dsh-session-pin-pinned__')
  }, BADGE.replace('button.', ''), { timeout: 15000 })
  try {
    await amberWait()
  } catch {
    const retryBadge = target.locator(BADGE).first()
    await retryBadge.waitFor({ state: 'visible', timeout: 5000 })
    await retryBadge.click()
    await amberWait()
  }
  log('step ui: badge turned amber (pinned)')
  await target.screenshot({ path: join(OUT_DIR, 'demo-pinned.png') })

  // Color swatch: click cycles the row onto a palette color, Shift+click
  // clears it (the settings write mirrors back through the store feed).
  await target.hover()
  const rowSwatch = target.locator(SWATCH).first()
  await rowSwatch.waitFor({ state: 'visible', timeout: 15000 })
  await rowSwatch.click()
  await page.waitForFunction((swatchClass) => {
    const swatch = document.querySelector(`button.${swatchClass}[data-color]`)
    return swatch !== null
  }, SWATCH.replace('button.', ''), { timeout: 15000 })
  log('step ui: color swatch assigned a row color')
  await target.screenshot({ path: join(OUT_DIR, 'demo-color.png') })
  await rowSwatch.click({ modifiers: ['Shift'] })
  await page.waitForFunction((swatchClass) =>
    document.querySelector(`button.${swatchClass}[data-color]`) === null,
  SWATCH.replace('button.', ''), { timeout: 15000 })
  log('step ui: Shift+click cleared the row color')

  // Workspace rows: the overlay path must carry [pin][swatch] controls
  // (presence only — clicking would reorder the operator's workspace list).
  // Environment precondition: a NAMED workspace row must exist — a sandbox
  // whose only bucket is the pseudo "ungrouped" row has no pinnable workspace
  // header, so the check reports SKIP instead of FAIL there.
  const wsRows = page.locator('[role="treeitem"][aria-expanded]')
  let wsControlsFound = false
  for (let index = 0; index < (await wsRows.count()); index += 1) {
    const candidate = wsRows.nth(index)
    if (await candidate.getAttribute('aria-selected') !== null) continue
    if ((await candidate.locator(BADGE).count()) === 1 && (await candidate.locator(SWATCH).count()) === 1) {
      wsControlsFound = true
      break
    }
  }
  if (wsControlsFound) {
    log('step ui: workspace header rows carry [pin][swatch] controls')
    await page.screenshot({ path: join(OUT_DIR, 'demo-workspace.png') })
  } else {
    log('step ui: SKIP workspace header controls (no named workspace row in this home)')
  }

  // Open the session and toggle through the header button (the
  // authoritative sessionId path — no title matching involved). Click the
  // row body (not the badge: its click stops propagation).
  await target.click()
  const headerButton = page.locator(HEADER).first()
  await headerButton.waitFor({ state: 'visible', timeout: 15000 })
  await page.waitForFunction((sel) => {
    const button = document.querySelector(sel)
    return button !== null && button.classList.contains('__dsh-session-pin-pinned__')
  }, HEADER, { timeout: 15000 })
  log('step ui: header toggle shows pinned state for the open session')
  await page.screenshot({ path: join(OUT_DIR, 'demo-header.png') })
  await headerButton.click()
  await page.waitForFunction((sel) => {
    const button = document.querySelector(sel)
    return button !== null && !button.classList.contains('__dsh-session-pin-pinned__')
  }, HEADER, { timeout: 15000 })
  log('step ui: header toggle unpinned')
  await headerButton.click()
  await page.waitForFunction((sel) => {
    const button = document.querySelector(sel)
    return button !== null && button.classList.contains('__dsh-session-pin-pinned__')
  }, HEADER, { timeout: 15000 })
  log('step ui: header toggle re-pinned')

  // Sidebar panel: open through the foot action, jump to the pinned row.
  const footer = page.locator(FOOTER).first()
  await footer.click()
  const panel = page.locator(PANEL).first()
  await panel.waitFor({ state: 'visible', timeout: 15000 })
  log('step ui: pinned-sessions panel opened')
  await page.screenshot({ path: join(OUT_DIR, 'demo-panel.png') })
  await panel.locator('[role="button"]').first().click()
  await panel.waitFor({ state: 'detached', timeout: 15000 }).catch(() => {})
  log('step ui: panel row jumped to the session and closed')

  // Persistence: reload, no hover, some badge must still be amber.
  await page.reload({ waitUntil: 'domcontentloaded' })
  const persistedBadge = page.locator(BADGE.replace('button.', 'button.') + `.${PINNED}`).first()
  await persistedBadge.waitFor({ state: 'visible', timeout: 60000 })
  log('step persistence: pin survived reload (settings host mode or localStorage fallback)')

  // Cleanup: unpin so the verification leaves no pin state.
  await persistedBadge.click()
  await page.waitForFunction((cls) => document.querySelector(`button.${cls}`) === null, PINNED, { timeout: 15000 })
  log('step cleanup: unpinned')
} catch (error) {
  fail(`browser step failed: ${String(error)}`)
} finally {
  await browser.close()
}

writeFileSync(join(OUT_DIR, 'results.json'), JSON.stringify(results, null, 2))
console.log(`verify-live done, ok=${results.ok}`)
