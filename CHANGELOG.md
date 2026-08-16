# Changelog

All notable changes to this project are documented in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project adheres to [Semantic Versioning](https://semver.org/).

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
