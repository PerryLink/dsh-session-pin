# AGENTS.md

Standalone DeepSeek Harness plugin repository (`dsh-session-pin`). Development follows the dsh-plugin-guide skill and the official plugin contract; this file records repo-local decisions.

## Layout

- `src/index.ts` — function-plugin contract (`name`/`inject`/`Config`/`apply`; NO default export — the Loader unwraps `exports.default ?? exports`). Injects `settings` only; registers the durable `session-pin` settings namespace (pin lists, color maps, organizer state, host policy) and, under `enableLogBacking`, the log-backed projection reader.
- `src/pin-log.ts` — the `session/pin` event schema, the pure projection fold, and the `PinLogAppender` PRE-FLIGHT gate. The host's ability to carry the event is decided before the first write: the known event vocabulary (`KNOWN_SESSION_EVENT_TYPES`, the module's single `@deepseek-ai/dsh-session` value import) plus an ignorable-marker source probe (cached per process). Hosts where neither holds (`0.1.2-alpha.1`: envelope removed, fail-closed read on unknown types) get no append at all — the first write is where a poisoned log would start, so it never happens.
- `src/pin-core.ts`, `src/pin-store.ts`, `src/pin-controller.ts`, `src/navigator.ts` — framework-free state: two pin levels, row colors, boards/tags/views, prune/reorder lifecycle. No cordis, no DOM.
- `src/client.ts` — browser half: store + controller + overlay + row-slot glue + slot contributions. Reads the `SessionId`/`WorkspaceId` brands from `@deepseek-ai/dsh-client-connection/client` (the removed `dsh-client-runtime` package must never reappear in this repo's imports or `dsh.client.inject`).
- `src/ui.ts` — slot UI. The session-header standard-kit seats (`sessionId`, `useProjection`) are typed as a LOCAL structural contract on the component props (the runtime merge package is gone; the runtime contract is structural). Type-only merges come from `dsh-client-ui-conversation`/`dsh-client-ui-sidebar`/`dsh-client-ui-layout`.
- `src/row-slot.ts` — `sessions.row.action` adaptation: registration is deferred through `slots.inject` (the callback runs only if the build declares the slot). Current hosts (`0.1.2-alpha.1`) declare no such slot, so the wait stays pending, the overlay covers session rows, and nothing throws.
- `scripts/build.mjs` — esbuild dual build; host externals (`schemastery`, `dsh-settings`, `dsh-session`) stay harness-resolved, the client bundle must contain no `@deepseek-ai/*` value import (purity check fails the build).

## Hard rules applied here

- **Pre-flight before write, never write-then-probe.** The log-backed append seam probes the host's event vocabulary and ignorable marker support before the first `session/pin` write; the result is cached per process (WeakMap keyed by the append implementation). A host that cannot carry the event receives zero appends and one warning; `allowUnmarked` is the deliberately dangerous opt-in.
- **Fail closed.** `enableLogBacking` defaults to `false`; on hosts that reject unknown event types the projection degrades to the settings cache — the durable state is never lost to a poisoned log.
- **Slot absence degrades, never throws.** Every slot contribution registers through `ctx.slots.inject` (deferred until declaration); the row-slot gate probes `slots.snapshot` and the DOM overlay covers session rows while the slot is undeclared.
- **Model-visible ⟺ logged.** The plugin is UI-only: nothing model-visible is added, no session events by default, no tokens on any request.
- **Waterfall discipline.** No waterfall listeners today; if one is added, passthrough MUST call `next()`.
- **Loud misconfiguration.** Invalid `Config` (negative `maxPins`, unknown enum members) fails `resolveConfig` at load.

## Checks

`pnpm run typecheck && pnpm test && pnpm run test:coverage && pnpm run lint && pnpm run check:readmes && pnpm run build && pnpm run verify:self-contained && pnpm run verify:artifacts && pnpm pack`

- `typecheck` resolves `@deepseek-ai/*` from the installed devDependencies (published `0.1.2-rc.1` line; this repo has no tsconfig paths). Client peers pin `>=0.1.1-rc.2 <0.2.0`; host peers keep the family baseline `>=0.1.0-rc.8 <0.2.0`.
- `verify:artifacts` also proves the built host ESM face imports under plain Node and that the client bundle carries the ModuleLoader handshake.
- The composition suite (`tests/composition.test.ts`) runs the BUILT entry through the real Loader in mkdtemp temp directories only.

## Release

Publishing is tag-driven (no release script): bump `package.json`, stamp the CHANGELOG `[Unreleased]` section into a dated `## [x.y.z]` entry, re-run the full gate, commit, and push `main --follow-tags` with a `v<version>` tag (never force). `.github/workflows/release.yml` re-runs the gate, verifies the CHANGELOG names the tagged version, publishes to npm with provenance (skips when `NPM_TOKEN` is unset or the version already exists), and creates the GitHub Release.

## Docs

- Five-language READMEs (`README.md`, `README.zh.md`, `README.es.md`, `README.pt.md`, `README.hi.md`) — keep all five in sync; the English file is the source of truth.
- GitHub topics `deepseek-harness`, `dsh`, `dsh-plugin`, `session-pin`, `pin`, `workspace` (mirror `package.json` keywords; the ecosystem's visibility channel is the `dsh-plugin` topic).
- License is Apache-2.0 (`LICENSE` + the package.json `license` field). No third-party runtime code is bundled (see `THIRD_PARTY_NOTICES.md` when dependencies enter).
