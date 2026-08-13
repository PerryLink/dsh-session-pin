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
  <a href="https://github.com/topics/dsh-plugin"><img src="https://img.shields.io/badge/topic-dsh--plugin-2ea44f.svg" alt="Topic: dsh-plugin"></a>
  <img src="https://img.shields.io/badge/DSH-0.1.0--rc.6-3884ff.svg" alt="DSH baseline: 0.1.0-rc.6">
  <img src="https://img.shields.io/github/stars/PerryLink/dsh-session-pin?style=flat" alt="GitHub stars">
</p>

> **Pin the conversations that matter.** A dual-face (host + browser) plugin for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) that puts a one-click pin badge on every session row — gray on hover, amber while pinned — moves pinned sessions to the top of their workspace group, and keeps the pin across restarts and browsers.

## Why pinning?

Session lists sort by recency: the conversation you rely on all week slowly sinks to the bottom, and every new chat buries it further. Dragging rows in the Manual sort mode works, but nobody discovers it — and pinned chats that still get re-sorted on activity are exactly what users of other coding agents complain about. `dsh-session-pin` gives you the one-click UX instead:

```
┌─ Sessions ──────────────────────────────┐
│ 📌 Implement login flow         3h      │  ← pinned: amber pin, always visible
│   Fix the auth bug              1h      │  ← hover shows a gray pin to toggle
│   Refactor the DB layer         2d      │
└─────────────────────────────────────────┘
```

## ✨ Features

- 🧷 **Hover pin badge** — a gray pushpin fades in at the left of the session title on hover; pinned sessions keep a solid amber pin. One click toggles, and the click never opens the session.
- 📌 **Top ordering** — pinning moves the session to the front of its workspace account via the public `workspace.insertSessionBefore` RPC. Under the core's **Manual** order the position stays put — no activity re-sorting.
- 💾 **Durable & cross-browser** — the pinned set lives in the host-side `session-pin` settings namespace (file-backed, hot-reloaded), written through the standard `settings.*` RPCs. Restart DSH, switch browsers: pins survive.
- 🔢 **Optional limit** — `config.maxPins` caps the pinned count (default `0` = unlimited); exceeding it is rejected with a log line.
- 🧩 **Zero core changes** — a standalone plugin for the stock DSH Web GUI; no patched harness required.
- 🌍 **Five languages** — English · 中文 · Español · Português · हिन्दी.

## 🚀 Quick start

1. **Install** — add the plugin to your profile's `cordis.yml`:

```yaml
plugins:
  '@dsh-external/dsh-session-pin':
    path: /path/to/dsh-session-pin
    config:
      maxPins: 5      # optional; 0 = unlimited (default)
```

2. **Build** (the web app refuses to start with a missing client bundle):

```sh
pnpm install
pnpm run build      # lib/index.js + lib/client.js
```

3. **Restart** `dsh web` and hover any session row in the sidebar — the pin badge appears at the left of the title. Click to pin.

**Uninstall** — remove the plugin row from `cordis.yml` and restart. The `session-pin` section can also be removed from `settings.yaml`; nothing else is written.

## ⚙️ Configuration

| Key | Type | Default | Meaning |
|---|---|---|---|
| `maxPins` | integer | `0` | Maximum pinned sessions; `0` = unlimited. Unpinning always works. |

## 🧠 How it works

- **Host half** (`src/index.ts`) — registers the `session-pin` settings namespace (`{ pinned: string[], maxPins }`). No session events, no model traffic.
- **Browser half** (`src/client.ts`) — binds the namespace through `ctx.settingsScope`, renders badges over the core session rows, and orders through `ctx.workspaces`. A `MutationObserver` re-applies badges after React re-renders; rows are identified by `[role="treeitem"][aria-selected]` plus title text (no row-level extension slot exists for third-party plugins yet).
- **Build** — esbuild emits the host ESM half and the client CJS half wrapped in the web boot factory (`window.__ModuleLoader__.load({ id, factory })`), with a purity gate that fails the build if any `@deepseek-ai/*` value import leaks into the browser bundle.

**Extension points used:** `settings` (host), `sessions` / `workspaces` / `settingsScope` / `connection` / `remote` (client). **Model-visible effects: none** — this is a UI-only plugin: it adds no session events and no tokens to any model request.

## 📦 Compatibility

| Layer | Baseline |
|---|---|
| DeepSeek Harness | snapshot 0812 / npm `@deepseek-ai/dsh@0.1.0-rc.6` generation (client packages `0.1.0-rc.6`) |
| Cordis peer | `@deepseek-ai/cordis: ^4.0.1` |
| Node (dev) | ≥ 22 |

## 🧪 Development

```sh
pnpm install
pnpm run typecheck  # tsc --noEmit
pnpm run test       # vitest unit tests
pnpm run build      # dual-half build + client-bundle purity check
```

## 🗺️ Roadmap

- Right-click / row-menu "Pin" entry (needs a core row-level slot or a menu overlay).
- Standalone **Pinned section** at the top of the sidebar, Slack-Starred-style — informed by how Cursor, Claude, Slack, Notion and Telegram all converge on a dedicated pinned block.
- Canonical residence: a log-backed `session/pin` event (the `session/title` pattern) once a client-readable projection channel exists.

## ⚠️ Known limitations

- **Ordering scope** — the pinned position is stable only under **Manual** order; under **Updated** order the core's activity promotion re-fronts active sessions. Ungrouped and flat-list views have no host-side account, so position is not persisted there (badges and pin state still work).
- **Remote browsers** — settings RPCs are loopback-only; remote browsers fall back to browser-local `localStorage`.
- **Duplicate titles** — rows are matched by title text; with duplicate titles the badge shows on every matching row and toggles the first match (cosmetic).
- **Row DOM dependency** — the overlay relies on the core rows' `role="treeitem"` / `aria-selected` structure and must follow upstream UI changes.

## 🌐 Community

- [DeepSeek Harness Discord](https://discord.gg/Ycq5dCaS4) · [official discussions](https://github.com/deepseek-ai/deepseek-harness/discussions)
- Discover more plugins on the [`dsh-plugin` topic](https://github.com/topics/dsh-plugin).

## 📜 License

Apache License 2.0 — see [LICENSE](LICENSE). Copyright © 2026 dsh-session-pin contributors.
