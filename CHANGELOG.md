# Changelog

All notable changes to this project are documented in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project adheres to [Semantic Versioning](https://semver.org/).

## [0.4.2] - 2026-08-21

### Changed

- **DeepSeek Harness rc.8 compatibility**: every `@deepseek-ai/dsh-*` development dependency moves from `0.1.0-rc.6` to the exact `0.1.0-rc.8`, the `dsh-settings` peer range widens to `>=0.1.0-rc.8 <0.2.0`, and the workshop manifest, READMEs, and compat workflow declare rc.8. No plugin code changed — all gates (typecheck, unit tests, coverage, lint, readme sync, build, self-contained, artifacts) pass against the rc.8 family, and the bundle mounts in a real rc.8 headless profile completing a keyless mock-LLM round trip.

## [0.4.1] - 2026-08-19

### Fixed

- **Client dictionaries survive hot-reload**: the browser half now holds the `locale.register` disposer on the locale inject scope's fiber (`ctx.effect`; the locale registry throws on a duplicate namespace). Disposing the client fiber unregisters the `session-pin` dictionaries; remounting re-registers cleanly instead of throwing the duplicate-namespace error. Regression covered by a dispose-and-remount client test against a duplicate-strict locale registry.

## [0.4.0] - 2026-08-16

### Added

- **Pin groups (boards)**: pins join named groups (`pin.createBoard` / `pin.assignBoard` / `pin.removeBoard`); the pinned panel shows board chips that filter to one group (plus "All"). Boards persist per-browser with the pins (store envelope v3; v1/v2 documents migrate forward).
- **Session tags & saved views**: entities carry up to 8 tags (≤24 chars); the panel's filter bar matches text (case-insensitive title substring) and tags, and any filter state saves as a named view (up to 20, one-click restore).
- **Session health summary**: each pinned session row shows a read-only, sanitized health line (`N msgs · you|ai · relative time`) derived from the public session snapshot — counts and directions only, never content, zero network.
- **`/goto <keyword>`**: a composer line starting with `/goto` plus Enter jumps to the matching session (unique hit opens, multiple hits list, no hit explains); the command line is never sent to the model.
- Five Config switches (`enableBoards` / `enableTags` / `enableViews` / `enableHealth` / `enableGoto`, default true) and matching settings-namespace fields; `src/navigator.ts` holds the pure organizer logic (boards/tags/views/filter/health/goto/sanitize) with unit coverage.

### Changed

- Pin, color, and the four pin surfaces are fully unchanged (0.3.x compatible); the store envelope moves v2 → v3 with forward migration.
- Five-language READMEs: navigation-organizer section and the five new Config rows; test count updated to 87.

## [0.3.1] - 2026-08-16

### Added

- **Bundle manifest**: `package.json` now declares a complete `dsh.bundle` manifest (`cordis.patch.yml` shipped in `files`), so the plugin installs with one command — `dsh plugin --profile <profile> add dsh-session-pin` — instead of a manual `cordis.yml` row.
- **Plugin Family cross-links**: the READMEs (English / 中文) now link the full PerryLink DSH plugin family.

## [0.3.0] - 2026-08-15

### Added

- **Workspace-level pins**: workspace header rows get the same pin controls as session rows; pinning a workspace moves it to the front of the workspace list (`workspace.insertBefore`).
- **Row colors**: a swatch after each pin cycles an 8-color preset palette (Shift+click clears); colored rows get a left accent bar plus a translucent tint, per level (session / workspace), persisted in settings or the v2 `localStorage` envelope.
- **Duplicate-pin fix**: on builds declaring the upstream `sessions.row.action` slot, the DOM overlay skips session rows entirely — a row can never show two pin sets; the overlay now observes the document body instead of the first `role="tree"` container, and re-renders on slot-registry changes.
- **Pinned panel** now lists both levels (workspaces + sessions) with color dots; the footer count includes both.
- Storage envelope **v2** with automatic migration of v1 / legacy bare-array documents.
- CI workflow (`ci`: typecheck, test, build), issue forms, PR template, `SECURITY.md`.

### Changed

- `maxPins` now applies **per level** (sessions and workspaces each have their own budget).
- Overlay click handling is routed by row kind, so a session row whose title collides with a workspace label can never toggle a workspace pin.
- Runtime probes guard newer service methods (`slots.subscribe/snapshot`, `workspace.insertBefore/startSession`) so older baselines degrade gracefully.
- READMEs synchronized across all five languages (English is the source).
- **Package renamed to unscoped `dsh-session-pin`** ahead of the first publish: the `@dsh-external` npm scope belongs to a retired DSH-beta organization and cannot be published into by third parties (403 for non-members).

## [0.2.0] - 2026-08-14

### Added

- Lucide-style pin badge with hover reveal and pinned state.
- Live verification script (`scripts/verify-live.mjs`) driving a headless browser against a running `dsh web`.
- Five-language READMEs (English · 中文 · Español · Português · हिन्दी) with demo screenshots.

### Changed

- Exposed `package.json` as a subpath export; aligned persistence docs with the DSH wire allowlist.
- Relicensed to Apache-2.0.

## [0.1.0] - 2026-08-14

### Added

- Initial release: pin sessions in the DSH web sidebar with a hover pin badge, session-header toggle, pinned-sessions panel, durable `session-pin` settings namespace, and top ordering via `workspace.insertSessionBefore`.
