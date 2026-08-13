# dsh-session-pin

English | [简体中文](./README.md)

A dual-face (host + browser) plugin that adds session pinning to the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DSH) Web GUI: hovering a session row in the sidebar reveals a gray pin badge at the left of the title; clicking it turns the badge amber and pins the session — durably stored on the host (survives restarts and browsers) and moved to the top of its workspace group. Click again to unpin.

## Features

- **Pin badge**: a gray pushpin appears at the title's left edge on row hover; pinned sessions show a persistent amber pin. Clicking toggles the pin without opening the session.
- **Top ordering**: pinning moves the session to the front of its workspace account through the public `workspace.insertSessionBefore` RPC; under the core's Manual order mode the position is stable against activity.
- **Pin limit (optional)**: `config.maxPins` caps the pinned count (default 0 = unlimited); the browser half rejects and logs beyond the limit.
- **Persistence**: the pinned set lives in the host-side `session-pin` settings namespace (file-backed, hot-reloaded), read and written by the browser half through the standard `settings.*` RPCs.

## Install

Register the plugin in DSH's `cordis.yml`:

```yaml
plugins:
  '@dsh-external/dsh-session-pin':
    path: /path/to/dsh-session-pin
    config:
      maxPins: 5      # optional; 0 = unlimited (default)
```

Build before launch (`dsh web` refuses to start when a client bundle is missing):

```sh
pnpm install
pnpm run build      # lib/index.js + lib/client.js
```

After restarting `dsh web`, the browser half loads with the page (`/plugins/@dsh-external/dsh-session-pin/client.js`) and appears in the `window.__DSH_BOOT__` manifest.

## Build / test

```sh
pnpm run build      # esbuild dual-half build + client-bundle purity check
pnpm run test       # pin-core unit tests (vitest)
pnpm run typecheck  # tsc --noEmit
```

## Design notes

- Dual-face plugin: the host half only registers the `session-pin` settings namespace (schema `{ pinned: string[] }`); the browser half binds it through `ctx.settingsScope.bind()` and renders/orders through `ctx.sessions`/`ctx.workspaces`.
- Session rows have no third-party row-level extension slot, so badges are DOM overlays: rows are identified by `[role="treeitem"][aria-selected]` and matched to the session list by title text; a `MutationObserver` re-applies badges idempotently after React re-renders.
- The client bundle uses the web boot factory format (`window.__ModuleLoader__.load({ id, factory })`) and only type-imports `@deepseek-ai/*`; the build's purity check rejects any `@deepseek-ai` value import that leaks into the client bundle.

## Version compatibility

Developed against the DSH snapshot0812 baseline (the `@deepseek-ai/dsh@0.1.0-rc.6` generation; client packages such as `@deepseek-ai/dsh-client-runtime@0.0.1-rc.1`); cordis peer `@deepseek-ai/cordis: ^4.0.1`.

## Known limitations and deferred work

- **Ordering scope**: the pinned position is stable only under Manual order; under the Updated order the core's activity promotion overrides plugin ordering. Ungrouped sessions and the flat "In one list" view have no host-side account, so their position is not persisted (the badge and pin state themselves still work).
- **Remote browsers**: settings RPCs are loopback-only; a remote browser falls back to browser-local localStorage.
- **Duplicate titles**: rows are matched by title text; with duplicate titles the badge appears on every matching row and the toggle acts on the first match (cosmetic).
- **Row DOM dependency**: the overlay depends on the core rows' `role="treeitem"`/`aria-selected` structure and needs to follow upstream UI changes.
- TODO(plugin): the canonical residence for pin state is a log-backed `session/pin` event (the `session/title` pattern); migrate once a client-readable projection channel for plugins exists — the settings namespace is the durable store for now.
