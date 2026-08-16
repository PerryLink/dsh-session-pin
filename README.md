# 📌 dsh-session-pin

<p align="center">
  <a href="README.md">English</a> ·
  <a href="README.zh-CN.md">中文</a> ·
  <a href="README.es.md">Español</a> ·
  <a href="README.pt.md">Português</a> ·
  <a href="README.hi.md">हिन्दी</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-Apache%202.0-blue.svg" alt="License: Apache-2.0">
  <img src="https://img.shields.io/npm/v/dsh-session-pin" alt="npm version">
  <img src="https://img.shields.io/npm/dm/dsh-session-pin" alt="npm downloads">
  <img src="https://github.com/PerryLink/dsh-session-pin/actions/workflows/ci.yml/badge.svg" alt="CI">
  <a href="https://github.com/topics/dsh-plugin"><img src="https://img.shields.io/badge/topic-dsh--plugin-2ea44f.svg" alt="Topic: dsh-plugin"></a>
  <img src="https://img.shields.io/badge/DSH-0.1.0--rc.6-3884ff.svg" alt="DSH baseline: 0.1.0-rc.6">
  <img src="https://img.shields.io/github/stars/PerryLink/dsh-session-pin?style=flat" alt="GitHub stars">
</p>

> **Pin the conversations that matter — and color them so you can find them at a glance.** A dual-face (host + browser) plugin for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) with two pin levels (workspaces and sessions), a per-pin color swatch that tints the row, and four pin surfaces: a hover [pin][swatch] pair on every row, a pin toggle in the session header, a sidebar foot action with a pinned panel, and per-browser durable pinning that keeps pins and colors across restarts.

## Why pinning?

Session lists sort by recency: the conversation you rely on all week slowly sinks to the bottom, and every new chat buries it further. Dragging rows in the Manual sort mode works, but nobody discovers it — and pinned chats that still get re-sorted on activity are exactly what users of other coding agents complain about. `dsh-session-pin` gives you the one-click UX instead, plus row colors so important areas stand out:

```
┌─ Workspaces ────────────────────────────┐
│ 🎨 Workbench            ███             │  ← pinned workspace, tinted red
│   📌 Implement login flow         3h    │  ← pinned session, tinted teal
│     Fix the auth bug              1h    │  ← hover shows a gray pin + swatch
│   Refactor the DB layer           2d    │
└─────────────────────────────────────────┘
```

## ✨ Features

- 🧷 **Row controls** — a gray pushpin fades in at the left of the session title on hover; pinned rows keep a solid amber pin. Where the build declares the upstream per-row slot (`sessions.row.action`), the [pin][swatch] pair renders through it with the authoritative session id — and the DOM overlay skips session rows entirely, so a row can never show two pin sets. On baselines without the slot, the DOM overlay covers session rows by title.
- 📂 **Workspace pins** — workspace header rows get the same [pin][swatch] pair (the upstream slot does not render there, so the overlay covers them, matched by the host-enforced unique workspace label). Pinning a workspace moves it to the front of the workspace list via the public `workspace.insertBefore` RPC.
- 🎨 **Row colors** — the swatch after each pin cycles through an 8-color preset palette on click (Shift+click clears). The colored row gets a left accent bar plus a translucent tint — session rows and workspace rows independently, so you can spot a region at a glance. Colors persist with the pins and are pruned with deleted entities.
- 📌 **Header toggle** — the same session-pin control lives in the session header's action row (`conversation.session.header.actions`), keyed by the framework-resolved session id: duplicate titles and blank sessions pin correctly here.
- 🗂 **Pinned panel** — a sidebar foot action opens a floating panel listing pinned workspaces and pinned sessions (newest pin first) with each row's color dot; clicking one jumps to it. Escape or a click outside closes it.
- 📐 **Top ordering** — pinning moves the session to the front of its workspace account via the public `workspace.insertSessionBefore` RPC, and a pinned workspace moves to the front of the workspace list; `reorderOnLoad` re-asserts both pinned prefixes after the lists load (idempotent, so it never fights the core's own re-sorting). Under the core's **Manual** order the position stays put.
- 💾 **Persistent pinning** — the host half registers the durable `session-pin` settings namespace (declared wire-exposed via `settings.register({ expose: true })` on builds that support it); the browser half reads through the standard `settings.*` RPCs. On builds whose web proxy does not serve plugin namespaces the browser half falls back to a versioned `localStorage` document (v1 documents migrate), with cross-tab sync through `storage` events.
- 📡 **Log-backed write channel** — on builds mounting the built-in `dsh-session-pin` service, every session toggle commits through the `session.setPinned` RPC first (the `session/pin` event log is the canonical residence) and mirrors the commit into the settings store, so the ordered list, panel, and reordering stay consistent. A failed or slow RPC degrades to a direct settings write; the next connection generation re-enables it. The session-header toggle reads the `pin` projection when the host serves it — cross-device commits converge through it. Workspace pins and colors are plugin-local state and always write to the store.
- 🔢 **Optional limit** — `config.maxPins` caps the pinned count per level (default `0` = unlimited); exceeding it shows an inline limit hint on the badge.
- 🧭 **Pin groups (boards)** — pins can join named groups ("本周发布", "研究"); the pinned panel shows board chips that filter to one group, with an "All" reset. Boards persist like pins (per-browser) and survive reloads.
- 🏷 **Tags & saved views** — tag sessions and workspaces; the panel's filter bar filters by text and tag, and any filter state saves as a named view for one-click switching (up to 20 views).
- ❤️ **Health summary** — each pinned session row shows a read-only, sanitized health line (message count, last direction, relative activity) derived from the public session snapshot; nothing is written and nothing leaves the browser.
- 🔎 **`/goto <keyword>`** — type `/goto` plus a keyword in the composer and press Enter: a unique title/tag match opens the session, multiple matches list, no match explains. The plugin never sends the command line.
- 🧹 **Self-healing state** — `pruneStale` drops pins and colors whose workspaces/sessions were deleted or archived once the lists are ready.
- 🌍 **Localized UI** — badge, swatch, header, foot, and panel copy ship in 中文 and English through the locale service; compositions without it keep the English fallback. Readmes: English · 中文 · Español · Português · हिन्दी.
- 🧩 **Zero core changes** — a standalone plugin for the stock DSH Web GUI; every new surface degrades gracefully on older baselines.

## 🚀 Quick start

1. **Install** — one command from npm (the package declares a `dsh.bundle`
   manifest, so the plugin row registers automatically):

```sh
dsh plugin --profile <your-profile> add dsh-session-pin
```

   Or add the plugin to your profile's `cordis.yml` manually:

```yaml
plugins:
  'dsh-session-pin':
    path: /path/to/dsh-session-pin
    config:
      maxPins: 5        # optional; 0 = unlimited per level (default)
      reorderOnLoad: true   # optional; re-assert pinned order after load (default)
      pruneStale: true      # optional; drop pins of deleted entities (default)
```

> **Loader entry id.** The loader deduplicates entry ids across the whole root
> include tree. On harness builds whose `dsh-base` bundle mounts the built-in
> host service `@deepseek-ai/dsh-session-pin` (entry id `session-pin` — the
> log-backed pin state and `session.setPinned` RPC), give THIS plugin a
> distinct entry id, e.g. `id: session-pin-ui`, in the profile patch row.
> A duplicate `session-pin` id fails the whole boot with
> "duplicate loader entry id". The plugin's internal cordis `name` and its
> settings namespace stay `session-pin` — only the profile entry id must differ.

2. **Build** (the web app refuses to start with a missing client bundle):

```sh
pnpm install
pnpm run build      # lib/index.js + lib/client.js
```

3. **Restart** `dsh web` and hover any row in the sidebar — the pin badge (and the color swatch) appears at the left of the title. Click to pin; click the swatch to cycle colors; Shift+click the swatch to clear the color; toggle the pin again from the session header; open the pinned list from the sidebar foot.

**Uninstall** — remove the plugin row from `cordis.yml` and restart. The `session-pin` section can also be removed from `settings.yaml`; nothing else is written.

## ⚙️ Configuration

| Key | Type | Default | Meaning |
|---|---|---|---|
| `maxPins` | integer | `0` | Maximum pinned entities per level (sessions and workspaces each have their own budget); `0` = unlimited. Unpinning always works. |
| `reorderOnLoad` | boolean | `true` | Re-assert the pinned prefixes (newest pin first) once the session/workspace lists are ready and on workspace changes. |
| `pruneStale` | boolean | `true` | Drop pins and colors for entities absent from a ready list (deleted/archived). |
| `enableBoards` | boolean | `true` | Enable pin groups (boards) in the sidebar panel. |
| `enableTags` | boolean | `true` | Enable session/workspace tags and the panel filter bar. |
| `enableViews` | boolean | `true` | Enable saved filter views. |
| `enableHealth` | boolean | `true` | Enable the per-pinned-session health summary (read-only, sanitized). |
| `enableGoto` | boolean | `true` | Enable the `/goto <keyword>` composer command. |

## 🧭 Navigation organizer

On top of pinning, four browser-local capabilities organize multi-session work. All state rides the same `session-pin` store (per-browser; nothing is uploaded), and each feature has a Config switch above.

- **Boards** — pins join named groups; the panel shows one chip per board (plus "All") that filters the list. Create boards and move pins through the controller API (`pin.createBoard`, `pin.assignBoard`) or the panel chips.
- **Tags & views** — entities carry up to 8 tags (≤24 chars each); the filter bar matches text (case-insensitive substring over titles) and tags; any filter state saves as a named view (`+ view` chip) and restores in one click.
- **Health summary** — each pinned session row appends a sanitized line: `N msgs · you|ai · relative time`, derived read-only from the public session snapshot (`kind`/`time` of finalized messages). Counts and directions only — never content.
- **`/goto`** — a composer line starting with `/goto <keyword>` and Enter jumps: one title/tag match opens it, several list in a prompt, none explains. The Enter is consumed — the command line never reaches the model. (Matches the official sidebar's own quick-jump without replacing it; see the boundary note in Known limitations.)

## 🧠 How it works

- **Host half** (`src/index.ts`) — registers the `session-pin` settings namespace (`{ pinned, workspacePinned, colors, workspaceColors, maxPins, reorderOnLoad, pruneStale }`), with the policy riding the composition base layer. No session events, no model traffic.
- **Browser half** (`src/client.ts`) — assembles a framework-free `PinStore` (settings transport, degrading to a versioned `localStorage` document with cross-tab sync), a `PinController` (two-level toggle / color cycle / prune / reorder state machine), and the UI: the row overlay (workspace rows always; session rows only while the row slot is undeclared), the optional row-slot registration, the header toggle, the sidebar foot action, and the overlay panel. Ordering goes through `ctx.workspaces`; the row tint is pure CSS (`:has()` keyed on the swatch's `data-color` class).
- **Build** — esbuild emits the host ESM half and the client CJS half wrapped in the web boot factory (`window.__ModuleLoader__.load({ id, factory })`); `react` is externalized onto the module-table seed word so the bundle renders with the shell's own React. A purity gate fails the build if any `@deepseek-ai/*` value import leaks into the browser bundle.

**Extension points used:** `settings` (host); `sessions`, `workspaces`, `settingsScope`, `connection`, `remote`, `slots` (client); `locale` (client, optional); `conversation.session.header.actions`, `sidebar.footer.action`, `shell.overlay`, and the upstream `sessions.row.action` row slot when declared. **Model-visible effects: none** — this is a UI-only plugin: it adds no session events and no tokens to any model request.

## 📦 Compatibility

| Layer | Baseline |
|---|---|
| DeepSeek Harness | npm `@deepseek-ai/dsh@0.1.0-rc.6` generation (client packages `0.1.0-rc.6`); newer builds activate the row slot, wire-exposed settings, and the `session/pin` projection automatically |
| Cordis peer | `@deepseek-ai/cordis: ^4.0.1` |
| Node (dev) | ≥ 22 |
| Browser | Modern Chromium/Firefox/Safari; the row tint needs CSS `:has()` (Chrome 105+, Firefox 121+, Safari 15.4+) — older browsers still get the swatch dot, just no row tint |

## 🧪 Development

```sh
pnpm install
pnpm run typecheck  # tsc --noEmit
pnpm run test       # vitest unit tests (pin-core, store, controller, overlay, host registration)
pnpm run build      # dual-half build + client-bundle purity check
node scripts/verify-live.mjs   # live check against a running `dsh web` (DSH_CHECKOUT env)
```

## 🗺️ Roadmap

- Right-click / row-menu "Pin" entry (needs a core row-level menu slot; the row badge slot is upstream now).
- Canonical residence: a log-backed `session/pin` event + `pin` projection + write RPC (upstream) — the settings namespace then retires as the durable store and the plugin consumes `useProjection('pin')`.
- A full color-picker popover (custom colors) once the canonical residence exists; today's cycle swatch covers the preset palette.

## ⚠️ Known limitations

- **Persistence scope** — on builds whose web proxy does not serve plugin settings namespaces, the browser half stores pins and colors in a versioned `localStorage` document (browser-local) until upstream exposes the namespace (declared via `settings.register({ expose: true })` on newer builds). The host-side registration is already in place and becomes the durable store automatically.
- **Ordering scope** — the pinned position is stable only under **Manual** order; under **Updated** order the core's activity promotion re-fronts active sessions, and `reorderOnLoad` re-asserts the prefixes on load and workspace changes. Ungrouped and flat-list views have no host-side account, so session position is not persisted there (badges, colors, and pin state still work). Workspace reordering persists through the registry display order.
- **Remote browsers** — settings RPCs are loopback-only on the baseline; remote browsers fall back to browser-local `localStorage`.
- **Row badge fallback** — where the upstream row slot is unavailable, session rows are matched by title text; with duplicate titles the badge shows on every matching row and toggles the first match (cosmetic). The header toggle is always id-keyed and unaffected. On builds WITH the slot, session rows render only through the slot — no fallback duplication is possible.
- **Workspace-row matching** — workspace controls are matched by label (host-enforced unique); renaming a workspace follows automatically. The ungrouped bucket and search-result rows intentionally get no controls.
- **Row DOM dependency** — the overlay relies on the core rows' `role="treeitem"` / `aria-selected` / `aria-expanded` structure and must follow upstream UI changes.

## 🌐 Community

- [DeepSeek Harness Discord](https://discord.gg/Ycq5dCaS4) · [official discussions](https://github.com/deepseek-ai/deepseek-harness/discussions)
- Discover more plugins on the [`dsh-plugin` topic](https://github.com/topics/dsh-plugin).

## 👥 Contributors

Thanks to everyone who has shaped this plugin:

- [**PerryLink**](https://github.com/PerryLink) — creator & maintainer: pin UX, durable persistence, workspace ordering, per-pin row colors, five-language docs, and community engineering (v0.1.0 → v0.3.0).

_Contributions welcome — open an [issue](https://github.com/PerryLink/dsh-session-pin/issues) or start a [discussion](https://github.com/PerryLink/dsh-session-pin/discussions) to get involved._

## 📜 License

Apache License 2.0 — see [LICENSE](LICENSE). Copyright © 2026 dsh-session-pin contributors.

## PerryLink DSH Plugin Family

This project is one of the [15 DeepSeek Harness plugins](https://github.com/PerryLink) maintained by [PerryLink](https://github.com/PerryLink). If this one helps you, the others likely will too:

| Plugin | One-liner |
|---|---|
| [dsh-mcp-panel](https://github.com/PerryLink/dsh-mcp-panel) | Read-only MCP runtime panel: /mcp command + Settings tab with status, tools and errors |
| [dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck) | Engineering-discipline guard: requirements grill, test gates, adversary review |
| [dsh-background-agents](https://github.com/PerryLink/dsh-background-agents) | Durable background child agents with a Web UI sidebar, messaging and interrupt |
| [dsh-lsp-actions](https://github.com/PerryLink/dsh-lsp-actions) | LSP diagnostics, formatting, completion, code actions and rename over language servers |
| [dsh-output-styles](https://github.com/PerryLink/dsh-output-styles) | Claude Code outputStyles-equivalent runtime style switching |
| [dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind) | Claude Code /rewind-equivalent: snapshots, session forks, one-shot restore |
| [dsh-permission-rules](https://github.com/PerryLink/dsh-permission-rules) | Claude Code-style declarative allow/deny/ask permission rules with audit |
| [dsh-auto-review](https://github.com/PerryLink/dsh-auto-review) | Second-model auto-review on the approval chain, fail-closed by default |
| [dsh-memento](https://github.com/PerryLink/dsh-memento) | Approval-gated cross-session memory: ctx.memory seam + SQLite + memory tool |
| [dsh-skill-pack-security](https://github.com/PerryLink/dsh-skill-pack-security) | Security-audit skill pack: secret scan, dependency and supply-chain review |
| **[dsh-session-pin](https://github.com/PerryLink/dsh-session-pin)** | Pin sessions in the Web sidebar with durable ordering |
| [dsh-composer-history](https://github.com/PerryLink/dsh-composer-history) | Terminal-style input history for the web composer: arrows, Ctrl+R search |
| [dsh-github](https://github.com/PerryLink/dsh-github) | GitHub PR/issues integration for DSH, every write gated by approval |
| [dsh-plugin-guide](https://github.com/PerryLink/dsh-plugin-guide) | Plugin-development knowledge base as an on-demand agent skill |
| [dsh-claude-move](https://github.com/PerryLink/dsh-claude-move) | Migrate Claude Code sessions, memory, skills and CLAUDE.md into DSH |
