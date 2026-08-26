<div align="center">

# 📌 dsh-session-pin
[![Gitee](https://img.shields.io/badge/Gitee-mirror-c71d23?logo=gitee)](https://gitee.com/perrylink/dsh-session-pin)

**Pin sessions and workspaces to the top of the DeepSeek Harness sidebar with per-pin row colors.**

*A dual-face (host + browser) plugin: two pin levels, an 8-color swatch per pin, and a navigation organizer — boards, tags, saved views, health summaries, and `/goto`.*

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![DSH plugin](https://img.shields.io/badge/dsh-plugin-✅-green)](https://github.com/topics/dsh-plugin)
[![Node](https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24-brightgreen.svg)](#)
[![CI](https://img.shields.io/github/actions/workflow/status/PerryLink/dsh-session-pin/ci.yml?branch=main&label=CI)](https://github.com/PerryLink/dsh-session-pin/actions)
[![Version](https://img.shields.io/github/v/tag/PerryLink/dsh-session-pin?label=version)](https://github.com/PerryLink/dsh-session-pin/releases)
[![npm version](https://img.shields.io/npm/v/dsh-session-pin)](https://www.npmjs.com/package/dsh-session-pin)
[![npm downloads](https://img.shields.io/npm/dm/dsh-session-pin)](https://www.npmjs.com/package/dsh-session-pin)

[English](README.md) · [简体中文](README.zh.md) · [Español](README.es.md) · [Português](README.pt.md) · [हिन्दी](README.hi.md)

</div>

---

## Compatibility

| Surface | Status |
|---|---|
| Harness | DeepSeek Harness `0.1.1-rc.2` (client packages `0.1.1-rc.2`) |
| Node | `>= 22` (development floor) |
| Platforms | Web GUI (dual-face: host + browser) |
| Model | Any (UI-only — no model traffic, no session events) |

## What you get

`dsh-session-pin` keeps the conversations that matter at the top of the sidebar and colors them so you can find them at a glance:

- **Two pin levels** — pin whole workspaces and individual sessions; a pinned workspace moves to the front of the workspace list and a pinned session to the front of its account.
- **Per-pin row colors** — a swatch after each pin cycles an 8-color preset palette (Shift+click clears); the row gets a left accent bar plus a translucent tint.
- **Four pin surfaces** — a hover `[pin][swatch]` pair on every row, a pin toggle in the session header, a sidebar foot action with a pinned panel, and per-browser durable pinning that keeps pins and colors across restarts.
- **Zero core changes** — a standalone plugin for the stock DSH Web GUI; every surface degrades gracefully on older baselines.

```text
┌─ Workspaces ────────────────────────────┐
│ 🎨 Workbench            ███             │  ← pinned workspace, tinted red
│   📌 Implement login flow         3h    │  ← pinned session, tinted teal
│     Fix the auth bug              1h    │  ← hover shows a gray pin + swatch
│   Refactor the DB layer           2d    │
└─────────────────────────────────────────┘
```

## Navigation organizer

Four browser-local capabilities organize multi-session work on top of pinning. All state rides the same `session-pin` store (per-browser; nothing is uploaded), and each has a Config switch.

- **Boards** — pins join named groups; the board chip row creates, renames, and deletes boards and drag-reorders them (order persists per-browser), while the pinned panel groups each board's pins under a collapsible header.
- **Tags & views** — entities carry up to 8 tags (≤24 chars each), set per row from the panel's manage button (which also assigns the pin's board); the filter bar matches text and tags, and any filter state saves as a named view (up to 20) for one-click switching.
- **Health summary** — each pinned session row appends a read-only, sanitized line (`N msgs · you|ai · relative time`) derived from the public session snapshot — counts and directions only, never content.
- **`/goto <keyword>`** — a composer line starting with `/goto` plus Enter jumps: a unique title/tag match opens it, several matches list in a prompt, none explains. The command line never reaches the model.

## How it works

- **Host half** (`src/index.ts`) — registers the durable `session-pin` settings namespace (the two pinned id lists, the two color maps, and the organizer state, plus the host policy `maxPins`/`reorderOnLoad`/`pruneStale`); no session events, no model traffic.
- **Browser half** (`src/client.ts`) — assembles a framework-free `PinStore` (settings transport, degrading to a versioned `localStorage` document with cross-tab sync), a `PinController` (two-level toggle / color cycle / prune / reorder state machine), and the UI: the row overlay, the optional row-slot registration, the header toggle, the sidebar foot action, and the pinned panel. Ordering goes through `ctx.workspaces`.
- **Log-backed write channel** — on builds mounting the built-in `dsh-session-pin` service, every session toggle commits through the `session.setPinned` RPC first (the `session/pin` event log is the canonical residence) and mirrors the commit into the settings store; a failed or slow RPC degrades to a direct settings write.
- **Log-backed projection read** — `enableLogBacking` (host Config, fail-closed default off) mounts a projection reader that folds live `session/pin` events into the canonical pin set and mirrors the folded `pinned`/`colors` into the settings namespace, which becomes the idempotent cache for the log-backed state. The event schema, the pure fold (`foldPinEvents`), and the ignorable-gated append seam (`PinLogAppender`) live in `src/pin-log.ts`; the settings/localStorage store remains the compat + degradation path.
- **Build** — esbuild emits the host ESM half and the client CJS half wrapped in the web boot factory (`window.__ModuleLoader__.load({ id, factory })`); `react` is externalized onto the shell's own React, and a purity gate fails the build if any `@deepseek-ai/*` value import leaks into the browser bundle.

**Extension points used:** `settings` (host); `sessions`, `workspaces`, `settingsScope`, `connection`, `remote`, `slots` (client); `locale` (client, optional); `conversation.session.header.actions`, `sidebar.footer.action`, `shell.overlay`, and the upstream `sessions.row.action` row slot when declared. **Model-visible effects: none** — this is a UI-only plugin: it adds no session events and no tokens to any model request.

## Quick start

```sh
# 1. install the bundle into your profile
dsh plugin --profile web add "github:PerryLink/dsh-session-pin#main"

# or from npm (published releases)
dsh plugin --profile web add dsh-session-pin

# 2. restart and verify the row
dsh --profile web --dump-config | grep -A3 'id: session-pin'
```

> **Loader entry id.** On harness builds whose `dsh-base` bundle mounts the built-in host service `@deepseek-ai/dsh-session-pin` (entry id `session-pin`), give this plugin a distinct entry id such as `id: session-pin-ui` in the profile patch row — a duplicate `session-pin` id fails the boot with "duplicate loader entry id".

## Install & uninstall

- **git channel** (latest `main`): `dsh plugin --profile web add "github:PerryLink/dsh-session-pin#main"` — `pnpm run build` emits the host half (`lib/index.js`) and the browser half (`lib/client.js`).
- **npm channel** (published releases): `dsh plugin --profile web add dsh-session-pin`.
- **tarball channel**: `pnpm pack` in this repo, then `dsh plugin --profile web add ./dsh-session-pin-<version>.tgz`.
- **uninstall**: `dsh plugin --profile web remove dsh-session-pin` (or remove the row from the profile patch; the `session-pin` section of `settings.yaml` can also be removed).

## Configuration

All tunables are Schemastery `Config` fields (changeable from cordis.yml). `cordis.patch.yml` mounts the bundle with the defaults below.

| Key | Default | Meaning |
|---|---|---|
| `maxPins` | `0` | Maximum pinned entities per level (sessions and workspaces each have their own budget); `0` = unlimited |
| `reorderOnLoad` | `true` | Re-assert the pinned prefixes (newest pin first) once the lists are ready |
| `pruneStale` | `true` | Drop pins and colors for entities absent from a ready list (deleted/archived) |
| `enableBoards` | `true` | Enable pin groups (boards) in the sidebar panel |
| `enableTags` | `true` | Enable session/workspace tags and the panel filter bar |
| `enableViews` | `true` | Enable saved filter views |
| `enableHealth` | `true` | Enable the per-pinned-session health summary (read-only, sanitized) |
| `enableGoto` | `true` | Enable the `/goto <keyword>` composer command |
| `enableLogBacking` | `false` | Fold `session/pin` events into a log-backed projection and mirror it into the settings cache (fail-closed: the session log is canonical when enabled) |

## Tools & surfaces

| Surface | Kind | Notes |
|---|---|---|
| `[pin][swatch]` row controls | UI slot / DOM overlay | Hover controls on every session and workspace row |
| Session header toggle | UI slot | The same pin control in the header action row, keyed by session id |
| Sidebar foot + pinned panel | UI slot / overlay | Lists pinned workspaces and sessions, grouped by board (collapsible) with per-row board/tag manage and color dots |
| `/goto <keyword>` | command | Composer quick-jump by title/tag; the line never reaches the model |
| `session-pin` settings namespace | host service | Durable per-browser store for pins, colors, and organizer state |

## Permissions & data

- **Permissions**: the `dshWorkshop` manifest declares `browser:local-storage`, `settings:read`, and `settings:write`.
- **Data**: pins, colors, and organizer state live per browser in the `session-pin` settings namespace, degrading to a versioned `localStorage` document (v1 documents migrate) where the web proxy does not serve the namespace. Nothing is uploaded. With `enableLogBacking`, the settings namespace becomes the idempotent cache for the log-backed `session/pin` projection.
- **Session log**: none by default — this plugin adds no session events and no tokens to any model request. When `enableLogBacking` is on, the host folds the log-only `session/pin` event (written by the upstream `session.setPinned` RPC) into the canonical pin projection; model-visible effects remain none.

## Security boundaries

- **UI-only.** No model-visible effects, no network, no subprocesses; every surface degrades gracefully on older baselines.
- **Durable, bounded state.** Pins and colors are pruned with deleted entities (`pruneStale`); `maxPins` caps the pinned count per level.
- **Read-only health.** The health summary derives counts and directions from the public session snapshot and writes nothing back.

## Known limitations

- **Persistence scope** — the log-backed canonical residence is opt-in (`enableLogBacking`, fail-closed default off) and its live read loop requires builds that emit the `session/pin` event (the upstream `session.setPinned` RPC); on baselines without it, pins and colors fall back to the `session-pin` settings namespace, then to browser-local `localStorage`.
- **Ordering scope** — the pinned position is stable only under **Manual** order; under **Updated** order the core's activity promotion re-fronts active sessions, and `reorderOnLoad` re-asserts the prefixes on load.
- **Remote browsers** — settings RPCs are loopback-only on the baseline; remote browsers fall back to browser-local `localStorage`.
- **Row badge fallback** — where the upstream row slot is unavailable, session rows are matched by title text; with duplicate titles the badge shows on every matching row and toggles the first match (cosmetic).
- **Row DOM dependency** — the overlay relies on the core rows' `role="treeitem"` structure and must follow upstream UI changes.

## Roadmap

- ~~Canonical residence: a log-backed `session/pin` event + `pin` projection + write RPC (upstream) — the settings namespace then retires as the durable store and the plugin consumes `useProjection('pin')`.~~ **Landed (P0):** the plugin ships the `session/pin` event schema, the pure projection fold (`foldPinEvents`), the ignorable-gated append seam (`PinLogAppender`), and a host projection reader (`enableLogBacking`) that folds live `session/pin` events back into the settings cache. The settings/localStorage store remains the compat + degradation path; the log is canonical when enabled.
- Self-build write fallback: wire `PinLogAppender` to append `session/pin` events on builds without the upstream `session.setPinned` RPC, so no-upstream baselines also log canonically.
- Consume the upstream `pin` projection (`useProjection('pin')`) on the client once `@deepseek-ai/dsh-session-pin` ships in the npm baseline; today the host mirror covers the read path on master builds.
- Right-click / row-menu "Pin" entry (needs a core row-level menu slot; the row badge slot is upstream now).
- A full color-picker popover (custom colors) once the canonical residence exists; today's cycle swatch covers the preset palette.

## Development

```sh
pnpm install                    # install dependencies
pnpm run typecheck              # tsc --noEmit
pnpm test                       # vitest unit tests
pnpm run build                  # dual-half build + client-bundle purity check
node scripts/verify-live.mjs    # live check against a running `dsh web` (DSH_CHECKOUT env)
```

## Topics

`deepseek-harness`, `dsh`, `dsh-plugin`, `session-pin`, `pin`, `workspace`

## Contributors

- [@PerryLink](https://github.com/PerryLink) — creator and maintainer: pin UX, durable persistence, workspace ordering, per-pin row colors, the navigation organizer, and the five-language docs.

## PerryLink DSH Plugin Family

This project is one of the [DeepSeek Harness plugins](https://github.com/PerryLink) maintained by [PerryLink](https://github.com/PerryLink). If this one helps you, the others likely will too:

| Plugin | One-liner |
|---|---|
| [dsh-mask](https://github.com/PerryLink/dsh-mask) | PII masking middleware: anonymize at the model boundary, restore at the display layer |
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

## License

[Apache License 2.0](LICENSE) © 2026 dsh-session-pin contributors
