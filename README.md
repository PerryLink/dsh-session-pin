<div align="center">

# 📌 dsh-session-pin

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
| Harness | DeepSeek Harness `0.1.0-rc.6` (client packages `0.1.0-rc.6`) |
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

- **Boards** — pins join named groups; the pinned panel shows one chip per board (plus "All") that filters the list.
- **Tags & views** — entities carry up to 8 tags (≤24 chars each); the filter bar matches text and tags, and any filter state saves as a named view (up to 20) for one-click switching.
- **Health summary** — each pinned session row appends a read-only, sanitized line (`N msgs · you|ai · relative time`) derived from the public session snapshot — counts and directions only, never content.
- **`/goto <keyword>`** — a composer line starting with `/goto` plus Enter jumps: a unique title/tag match opens it, several matches list in a prompt, none explains. The command line never reaches the model.

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

## Tools & surfaces

| Surface | Kind | Notes |
|---|---|---|
| `[pin][swatch]` row controls | UI slot / DOM overlay | Hover controls on every session and workspace row |
| Session header toggle | UI slot | The same pin control in the header action row, keyed by session id |
| Sidebar foot + pinned panel | UI slot / overlay | Lists pinned workspaces and sessions (newest pin first) with color dots |
| `/goto <keyword>` | command | Composer quick-jump by title/tag; the line never reaches the model |
| `session-pin` settings namespace | host service | Durable per-browser store for pins, colors, and organizer state |

## Permissions & data

- **Permissions**: the `dshWorkshop` manifest declares `browser:local-storage`, `settings:read`, and `settings:write`.
- **Data**: pins, colors, and organizer state live per browser in the `session-pin` settings namespace, degrading to a versioned `localStorage` document (v1 documents migrate) where the web proxy does not serve the namespace. Nothing is uploaded.
- **Session log**: none — this plugin adds no session events and no tokens to any model request.

## Security boundaries

- **UI-only.** No model-visible effects, no network, no subprocesses; every surface degrades gracefully on older baselines.
- **Durable, bounded state.** Pins and colors are pruned with deleted entities (`pruneStale`); `maxPins` caps the pinned count per level.
- **Read-only health.** The health summary derives counts and directions from the public session snapshot and writes nothing back.

## Known limitations

- **Persistence scope** — where the web proxy does not serve the `session-pin` namespace, pins and colors fall back to browser-local `localStorage`; the host registration becomes the durable store automatically once upstream exposes the namespace.
- **Ordering scope** — the pinned position is stable only under **Manual** order; under **Updated** order the core's activity promotion re-fronts active sessions, and `reorderOnLoad` re-asserts the prefixes on load.
- **Remote browsers** — settings RPCs are loopback-only on the baseline; remote browsers fall back to browser-local `localStorage`.
- **Row badge fallback** — where the upstream row slot is unavailable, session rows are matched by title text; with duplicate titles the badge shows on every matching row and toggles the first match (cosmetic).
- **Row DOM dependency** — the overlay relies on the core rows' `role="treeitem"` structure and must follow upstream UI changes.

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

## License

[Apache License 2.0](LICENSE) © 2026 dsh-session-pin contributors
